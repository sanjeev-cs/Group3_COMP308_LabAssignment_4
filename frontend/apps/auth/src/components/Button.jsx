const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  ...props
}) => (
  <button
    className={`btn btn-${variant} ${className}`.trim()}
    onClick={onClick}
    type={type}
    {...props}
  >
    {children}
  </button>
);

export default Button;
