import { useEffect, useRef, useState } from 'react';

const FederatedMount = ({ label, loader, remoteProps }) => {
  const containerRef = useRef(null);
  const remoteControllerRef = useRef(null);
  const latestPropsRef = useRef(remoteProps);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    latestPropsRef.current = remoteProps;
    remoteControllerRef.current?.update?.(remoteProps);
  }, [remoteProps]);

  useEffect(() => {
    let isCancelled = false;

    const mountRemote = async () => {
      setError(null);
      setIsLoading(true);

      try {
        const remoteModule = await loader();
        const mountRemoteApp = remoteModule.default;

        if (typeof mountRemoteApp !== 'function') {
          throw new Error(`The ${label} remote did not expose a mount function.`);
        }

        if (isCancelled || !containerRef.current) {
          return;
        }

        const remoteController = mountRemoteApp(containerRef.current, latestPropsRef.current);

        if (isCancelled) {
          remoteController?.unmount?.();
          return;
        }

        remoteControllerRef.current = remoteController ?? null;
        setIsLoading(false);
      } catch (mountError) {
        if (!isCancelled) {
          setError(mountError);
          setIsLoading(false);
        }
      }
    };

    mountRemote();

    return () => {
      isCancelled = true;
      remoteControllerRef.current?.unmount?.();
      remoteControllerRef.current = null;
    };
  }, [label, loader]);

  if (error) {
    throw error;
  }

  return (
    <>
      {isLoading ? (
        <section className="remote-state-card">
          <span className="eyebrow">Loading remote</span>
          <h2>{label}</h2>
          <p>The shell is fetching the latest federated bundle for this module.</p>
        </section>
      ) : null}
      <div ref={containerRef} style={{ display: isLoading ? 'none' : 'block' }} />
    </>
  );
};

export default FederatedMount;
