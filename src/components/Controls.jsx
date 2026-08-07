import './Controls.css';


function Controls(props) {
  const { primaryLabel, primaryDisabled, onPrimaryClick, secondaryLabel, onSecondaryClick } = props;

  return (
    <div className="controls">
      {secondaryLabel && (
        <button type="button" className="secondary-button" onClick={onSecondaryClick}>
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
