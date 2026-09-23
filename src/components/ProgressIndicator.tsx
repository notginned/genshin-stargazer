interface ProgressIndicatorProps {
  value?: string;
}

function ProgressIndicator({ value }: ProgressIndicatorProps) {
  return (
    <div className="progress-wrapper">
      <label className="progress-label" data-value={value}>
        {value}
        <progress max="100" value={value} />
        <div className="progress-icon"></div>
      </label>
    </div>
  );
}

export { ProgressIndicator };
