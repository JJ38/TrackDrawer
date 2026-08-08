import './Controls.css';


function Controls(props) {
  const { primaryLabel, primaryDisabled, onPrimaryClick, secondaryLabel, secondaryDisabled, onSecondaryClick } = props;

  return (
    <div className="controls">
      {secondaryLabel && (
        <button type="button" className="secondary-button" disabled={secondaryDisabled} onClick={onSecondaryClick}>
          {secondaryLabel}
        </button>
      )}

      <button
        type="button"
        className="primary-button"
        disabled={primaryDisabled}
        onClick={onPrimaryClick}
      >
        {primaryLabel}
      </button>
    </div>
  );
}


export default Controls;
