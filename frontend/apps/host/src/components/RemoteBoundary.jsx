import { Component } from 'react';

class RemoteBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <section className="remote-state-card">
          <span className="eyebrow">Remote unavailable</span>
          <h2>{this.props.label}</h2>
          <p>
            The host shell could not load this remote application. Start the remote
            Vite server and refresh the page.
          </p>
          <code>{this.state.error.message}</code>
        </section>
      );
    }

    return this.props.children;
  }
}

export default RemoteBoundary;
