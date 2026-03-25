const AuthLayout = ({ title, children, footer }) => (
  <div className="auth-form-container">
    <h2>{title}</h2>
    {children}
    {footer}
  </div>
);

export default AuthLayout;
