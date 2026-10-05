import React from 'react';
import Modal from '@/shared/components/Modal';
import { useOverlay } from '@/shared/contexts/OverlayContext';
import AddCAMCustomerModal from './AddCAMCustomerForm';

const AddCAMModal: React.FC = () => {
    const { closeAddCam } = useOverlay();

    return (
        <Modal onClose={closeAddCam} maxWidthClass="max-w-lg">
            <AddCAMCustomerModal />
        </Modal>
    );
};

export default AddCAMModal;