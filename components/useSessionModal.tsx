import React, { useEffect } from 'react';

const useSessionModal = (): [boolean, () => void] => {
    const session = "test";
    const [showModal, setShowModal] = React.useState(false);

    const hideModal = () => {
      const modalKey = "modalSession";
      localStorage.setItem(modalKey, session);
      setShowModal(false);
    };
    useEffect(() => {
      const modalKey = "modalSession";
      const modalSession = localStorage.getItem(modalKey);
      setShowModal(modalSession !== session);
    }, []);

    return [showModal, hideModal];
};

export default useSessionModal;
