# Sources F1 circuit outlines from OpenStreetMap and converts them into the
# track JSON format consumed by src/data/tracks.js. See CLAUDE.md's "Track
# data" section for the full methodology.
#
# Usage: python3 build_track.py <circuits-config.json> <output.json>
#   circuits.json in this directory has the full current-calendar list, with
#   name_pattern/bounding_box values already corrected from trial and error
#   (OSM name tags are inconsistent — some circuits only have their English
#   name under int_name or name:en, not name; accented characters need exact
#   matches). Re-run against a subset by copying the relevant entries out.
#
# Run in small foreground batches (4-5 circuits per call), not backgrounded
# and not all 24 in one process — long-lived background processes making
# many sequential Overpass requests were observed to hang silently in this
# environment (no error, no progress, no CPU use) partway through a run.
# Small foreground batches were completely reliable.
#
# The public Overpass mirror can rate-limit or time out under heavy use;
# run_overpass_query() retries with backoff, and OVERPASS_URL may need to be
# swapped to another public mirror if the current one is unresponsive
# (overpass-api.de, overpass.kumi.systems, overpass.openstreetmap.fr, ...).
#
# After a batch finishes, check each result's "status": "OK" is usable as-is;
# "NEEDS_REVIEW" means the reconstructed lap length or loop closure didn't
# meet the accuracy thresholds — inspect it (e.g. render the points as an SVG
# path, see data/tracks/silverstone-preview.svg for the pattern) before
# trusting it. "NO_RELATION_FOUND" / "NO_VALID_GEOMETRY" / "ERROR" mean no
# usable OSM data was found at all for that circuit.

import json
import math
import subprocess
import sys
import time


OVERPASS_URL = "https://overpass.openstreetmap.fr/api/interpreter"


def run_overpass_query(query_text):
    last_error = None
    for attempt_number in range(4):
        if attempt_number > 0:
            time.sleep(3 * attempt_number)

        result = subprocess.run(
            ["curl", "-s", "--max-time", "45", OVERPASS_URL, "--data-urlencode", "data=" + query_text],
            capture_output=True,
            text=True,
            timeout=60,
        )
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError as error:
            last_error = error

    raise last_error


def find_circuit_relations(name_pattern, bounding_box):
    south, west, north, east = bounding_box
    bbox_text = str(south) + "," + str(west) + "," + str(north) + "," + str(east)
    query_text = (
        "[out:json][timeout:40];"
        "("
        "relation[\"type\"=\"circuit\"][\"name\"~\"" + name_pattern + "\",i](" + bbox_text + ");"
        "relation[\"type\"=\"circuit\"][\"int_name\"~\"" + name_pattern + "\",i](" + bbox_text + ");"
        "relation[\"type\"=\"circuit\"][\"name:en\"~\"" + name_pattern + "\",i](" + bbox_text + ");"
        ");"
        "out tags;"
    )
    result = run_overpass_query(query_text)

    seen_ids = set()
    unique_elements = []
    for element in result.get("elements", []):
        if element["id"] not in seen_ids:
            seen_ids.add(element["id"])
            unique_elements.append(element)

    return unique_elements


def fetch_relation_geometry(relation_id):
    query_text = "[out:json][timeout:40];relation(" + str(relation_id) + ");out geom;"
    result = run_overpass_query(query_text)
    elements = result.get("elements", [])
    if len(elements) == 0:
        return None
    return elements[0]


def fetch_raw_raceway_ways(bounding_box):
    south, west, north, east = bounding_box
    bbox_text = str(south) + "," + str(west) + "," + str(north) + "," + str(east)
    query_text = "[out:json][timeout:40];(way[\"highway\"=\"raceway\"](" + bbox_text + "););out geom;"
    result = run_overpass_query(query_text)

    fake_members = []
    for element in result.get("elements", []):
        name = (element.get("tags", {}).get("name") or "").lower()
        if "pit" in name:
            continue
        if "geometry" not in element:
            continue
        fake_members.append({"type": "way", "ref": element["id"], "role": "", "geometry": element["geometry"]})

    return {"members": fake_members}


def haversine_distance_meters(point_a, point_b):
    earth_radius = 6371000
    latitude_a, longitude_a = math.radians(point_a[0]), math.radians(point_a[1])
    latitude_b, longitude_b = math.radians(point_b[0]), math.radians(point_b[1])
    delta_latitude = latitude_b - latitude_a
    delta_longitude = longitude_b - longitude_a
    haversine_term = math.sin(delta_latitude / 2) ** 2 + math.cos(latitude_a) * math.cos(latitude_b) * math.sin(delta_longitude / 2) ** 2
    return 2 * earth_radius * math.asin(math.sqrt(haversine_term))


def round_point(point):
    return (round(point[0], 6), round(point[1], 6))


def calculate_arc_length_midpoint(segment):
    cumulative_lengths = [0.0]
    for index in range(len(segment) - 1):
        cumulative_lengths.append(cumulative_lengths[-1] + haversine_distance_meters(segment[index], segment[index + 1]))

    half_length = cumulative_lengths[-1] / 2
    for index in range(len(segment) - 1):
        if cumulative_lengths[index + 1] >= half_length:
            segment_start_length = cumulative_lengths[index]
            segment_length = cumulative_lengths[index + 1] - segment_start_length
            interpolation_factor = (half_length - segment_start_length) / segment_length if segment_length > 0 else 0
            point_a = segment[index]
            point_b = segment[index + 1]
            return (
                point_a[0] + (point_b[0] - point_a[0]) * interpolation_factor,
                point_a[1] + (point_b[1] - point_a[1]) * interpolation_factor,
            )

    return segment[-1]


def group_segments_by_endpoints(segments):
    groups_by_endpoints = {}
    for segment in segments:
        key = frozenset([round_point(segment[0]), round_point(segment[-1])])
        groups_by_endpoints.setdefault(key, []).append(segment)
    return list(groups_by_endpoints.values())


def deduplicate_segments_by_endpoints(segments):
    # OSM edit history sometimes leaves two ways covering the same physical
    # stretch (e.g. a road redrawn with more detail without deleting the
    # original) — same start/end nodes, different point density. Those are
    # true duplicates and only the more detailed one should be kept.
    #
    # But two segments can share the same two endpoints without being
    # duplicates at all: a lap split into "front half" and "back half" ways
    # both run between the same two junction points, just via completely
    # different routes — as do a short closing connector and the long way
    # around the rest of the lap. Distinguishing the two from geometry alone
    # is unreliable (both cases have "different routes" between the same
    # points) — see build_ordered_loop_points_variants, which tries both
    # interpretations and lets the official-length check decide.
    deduplicated_segments = []
    for group in group_segments_by_endpoints(segments):
        deduplicated_segments.append(max(group, key=len))
    return deduplicated_segments


def stitch_segments_greedy(segments):
    if len(segments) == 0:
        return None, 0

    remaining_segments = segments[1:]
    current_path = list(segments[0])

    max_iterations = len(segments) * 2
    iterations = 0
    while len(remaining_segments) > 0 and iterations < max_iterations:
        iterations += 1
        path_start = round_point(current_path[0])
        path_end = round_point(current_path[-1])

        found_index = None
        for index, segment in enumerate(remaining_segments):
            segment_start = round_point(segment[0])
            segment_end = round_point(segment[-1])

            if segment_start == path_end:
                current_path = current_path + segment[1:]
                found_index = index
                break
            if segment_end == path_end:
                current_path = current_path + list(reversed(segment))[1:]
                found_index = index
                break
            if segment_end == path_start:
                current_path = segment[:-1] + current_path
                found_index = index
                break
            if segment_start == path_start:
                current_path = list(reversed(segment))[:-1] + current_path
                found_index = index
                break

        if found_index is None:
            break

        remaining_segments.pop(found_index)

    return current_path, len(remaining_segments)


def build_ordered_loop_points_variants(relation_element):
    way_members = [member for member in relation_element["members"] if member["type"] == "way"]

    seen_way_ids = set()
    open_segments = []
    self_closed_segments = []
    for member in way_members:
        way_id = member["ref"]
        role = member.get("role", "").lower()
        if "pit" in role:
            continue
        if way_id in seen_way_ids:
            continue
        if "geometry" not in member:
            continue
        seen_way_ids.add(way_id)

        geometry_points = [(point["lat"], point["lon"]) for point in member["geometry"]]
        if len(geometry_points) < 2:
            continue

        is_self_closed = round_point(geometry_points[0]) == round_point(geometry_points[-1])
        if is_self_closed:
            self_closed_segments.append(geometry_points)
        else:
            open_segments.append(geometry_points)

    # A self-closed way (its own start == end) is either the entire circuit
    # mapped as a single loop (e.g. Shanghai), or an unrelated small feature
    # caught by the bounding box (e.g. a roundabout). Only trust it when it's
    # clearly the dominant segment by point count — a real full-lap way will
    # dwarf any genuine track segment, while an unrelated small loop won't.
    # A dominant self-closed way is already a complete lap on its own — it
    # can't be spliced into a chain of other segments (nothing can attach to
    # the middle of an already-closed loop), so use it directly rather than
    # feeding it into the general stitcher alongside unrelated leftovers
    # (pit access stubs, etc.) that would otherwise be wrongly chained.
    largest_open_segment_size = max((len(segment) for segment in open_segments), default=0)
    dominant_self_closed_segment = None
    for segment in self_closed_segments:
        if len(segment) >= largest_open_segment_size:
            if dominant_self_closed_segment is None or len(segment) > len(dominant_self_closed_segment):
                dominant_self_closed_segment = segment

    if dominant_self_closed_segment is not None:
        return [stitch_segments_greedy([dominant_self_closed_segment])]

    # Two candidate interpretations of segments sharing endpoint pairs: keep
    # only the longest per pair (true OSM-history duplicates), or keep all of
    # them (complementary halves of the lap, or a closing connector). Both
    # are tried; build_track keeps whichever matches the official lap length.
    keep_longest_variant = stitch_segments_greedy(deduplicate_segments_by_endpoints(open_segments))
    keep_all_variant = stitch_segments_greedy(open_segments)

    return [keep_longest_variant, keep_all_variant]


def project_to_planar_meters(points):
    average_latitude = sum(point[0] for point in points) / len(points)
    average_longitude = sum(point[1] for point in points) / len(points)
    earth_radius = 6371000

    projected_points = []
    for latitude, longitude in points:
        x = math.radians(longitude - average_longitude) * earth_radius * math.cos(math.radians(average_latitude))
        y = math.radians(latitude - average_latitude) * earth_radius
        projected_points.append((x, y))

    return projected_points


def resample_closed_loop(points, target_count):
    is_closed_duplicate = points[0] == points[-1]
    loop_points = points[:-1] if is_closed_duplicate else points
    point_count = len(loop_points)

    segment_lengths = []
    total_length = 0.0
    for index in range(point_count):
        current_point = loop_points[index]
        next_point = loop_points[(index + 1) % point_count]
        segment_length = math.hypot(next_point[0] - current_point[0], next_point[1] - current_point[1])
        segment_lengths.append(segment_length)
        total_length += segment_length

    step_length = total_length / target_count
    resampled_points = []
    segment_index = 0
    length_covered_before_segment = 0.0

    for sample_index in range(target_count):
        target_distance = sample_index * step_length
        while length_covered_before_segment + segment_lengths[segment_index] < target_distance:
            length_covered_before_segment += segment_lengths[segment_index]
            segment_index = (segment_index + 1) % point_count

        current_point = loop_points[segment_index]
        next_point = loop_points[(segment_index + 1) % point_count]
        segment_length = segment_lengths[segment_index]
        distance_into_segment = target_distance - length_covered_before_segment
        interpolation_factor = distance_into_segment / segment_length if segment_length > 0 else 0
        x = current_point[0] + (next_point[0] - current_point[0]) * interpolation_factor
        y = current_point[1] + (next_point[1] - current_point[1]) * interpolation_factor
        resampled_points.append((x, y))

    return resampled_points, total_length


def normalize_points(points):
    centroid_x = sum(point[0] for point in points) / len(points)
    centroid_y = sum(point[1] for point in points) / len(points)
    centered_points = [(x - centroid_x, y - centroid_y) for x, y in points]

    min_x = min(point[0] for point in centered_points)
    max_x = max(point[0] for point in centered_points)
    min_y = min(point[1] for point in centered_points)
    max_y = max(point[1] for point in centered_points)
    width = max_x - min_x
    height = max_y - min_y
    scale = 1000.0 / max(width, height)

    normalized_points = [(round((x - min_x) * scale, 2), round((max_y - y) * scale, 2)) for x, y in centered_points]
    return normalized_points, round(width * scale, 1), round(height * scale, 1)


def evaluate_element(element, official_length_meters, relation_id, relation_name):
    best_candidate = None

    for raw_points, unstitched_segment_count in build_ordered_loop_points_variants(element):
        if raw_points is None or len(raw_points) < 20:
            continue

        closing_gap_meters = haversine_distance_meters(raw_points[0], raw_points[-1])
        planar_points = project_to_planar_meters(raw_points)
        resampled_points, reconstructed_length = resample_closed_loop(planar_points, 200)
        length_error_fraction = abs(reconstructed_length - official_length_meters) / official_length_meters

        candidate = {
            "relation_id": relation_id,
            "relation_name": relation_name,
            "closing_gap_meters": closing_gap_meters,
            "unstitched_segment_count": unstitched_segment_count,
            "reconstructed_length_meters": reconstructed_length,
            "length_error_fraction": length_error_fraction,
            "resampled_points": resampled_points,
        }

        if best_candidate is None or candidate["length_error_fraction"] < best_candidate["length_error_fraction"]:
            best_candidate = candidate

    return best_candidate


def build_track(track_id, display_name, location, name_pattern, bounding_box, official_length_meters):
    relations = find_circuit_relations(name_pattern, bounding_box)

    best_result = None
    for relation_summary in relations:
        relation_element = fetch_relation_geometry(relation_summary["id"])
        if relation_element is None:
            continue

        candidate = evaluate_element(
            relation_element,
            official_length_meters,
            relation_summary["id"],
            relation_summary.get("tags", {}).get("name"),
        )
        if candidate is None:
            continue

        if best_result is None or candidate["length_error_fraction"] < best_result["length_error_fraction"]:
            best_result = candidate

    used_raw_way_fallback = False
    if best_result is None or best_result["length_error_fraction"] >= 0.03 or best_result["closing_gap_meters"] >= 20:
        raw_ways_element = fetch_raw_raceway_ways(bounding_box)
        if len(raw_ways_element["members"]) > 0:
            raw_candidate = evaluate_element(raw_ways_element, official_length_meters, None, "raw highway=raceway ways")
            if raw_candidate is not None:
                if best_result is None or raw_candidate["length_error_fraction"] < best_result["length_error_fraction"]:
                    best_result = raw_candidate
                    used_raw_way_fallback = True

    if best_result is None:
        return {"track_id": track_id, "status": "NO_VALID_GEOMETRY"}

    normalized_points, normalized_width, normalized_height = normalize_points(best_result["resampled_points"])

    # Leftover unstitched segments (pit lanes/spurs without a recognizable role
    # tag) are common and harmless as long as the main loop still closes
    # cleanly and matches the official length — those two checks are the
    # real signal, same as the manual verification used for Silverstone.
    is_length_accurate = best_result["length_error_fraction"] < 0.03
    is_closed = best_result["closing_gap_meters"] < 20
    status = "OK" if (is_length_accurate and is_closed) else "NEEDS_REVIEW"

    if best_result["relation_id"] is not None:
        source_reference = "https://www.openstreetmap.org/relation/" + str(best_result["relation_id"])
        source_description = "OSM relation " + str(best_result["relation_id"]) + " (type=circuit)"
    else:
        source_reference = None
        source_description = "raw highway=raceway ways (no grouping relation exists in OSM for this circuit)"

    return {
        "track_id": track_id,
        "status": status,
        "relation_id": best_result["relation_id"],
        "relation_name": best_result["relation_name"],
        "closing_gap_meters": round(best_result["closing_gap_meters"], 1),
        "unstitched_segment_count": best_result["unstitched_segment_count"],
        "reconstructed_length_meters": round(best_result["reconstructed_length_meters"], 1),
        "official_length_meters": official_length_meters,
        "length_error_fraction": round(best_result["length_error_fraction"], 4),
        "output": {
            "id": track_id,
            "name": display_name,
            "location": location,
            "layout": "Grand Prix Circuit (current F1 layout)",
            "source": {
                "provider": "OpenStreetMap contributors",
                "license": "ODbL 1.0 (https://www.openstreetmap.org/copyright)",
                "relation": source_reference,
                "note": "Traced from " + source_description + ", pit lane excluded. Reconstructed lap length "
                        + str(round(best_result["reconstructed_length_meters"])) + "m vs official " + str(official_length_meters) + "m.",
            },
            "coordinateSpace": {
                "width": normalized_width,
                "height": normalized_height,
                "origin": "top-left",
                "yDown": True,
                "note": "x/y are unitless canvas/SVG coordinates. y increases downward. Points are evenly arc-length-spaced (not corner-preserving) for fair shape-similarity comparison against user strokes.",
            },
            "pointCount": len(normalized_points),
            "closed": True,
            "points": [[x, y] for x, y in normalized_points],
        },
    }


if __name__ == "__main__":
    with open(sys.argv[1]) as config_file:
        circuit_definitions = json.load(config_file)

    reports = []
    for circuit_definition in circuit_definitions:
        print("Processing " + circuit_definition["track_id"] + "...", file=sys.stderr)
        try:
            report = build_track(
                circuit_definition["track_id"],
                circuit_definition["display_name"],
                circuit_definition["location"],
                circuit_definition["name_pattern"],
                circuit_definition["bounding_box"],
                circuit_definition["official_length_meters"],
            )
        except Exception as error:
            report = {"track_id": circuit_definition["track_id"], "status": "ERROR", "error": str(error)}
        reports.append(report)
        time.sleep(2)

    with open(sys.argv[2], "w") as output_file:
        json.dump(reports, output_file, indent=2)

    for report in reports:
        print(report["track_id"] + ": " + report["status"], file=sys.stderr)
