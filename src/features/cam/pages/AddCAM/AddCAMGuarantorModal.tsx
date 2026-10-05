import React from 'react';
import Modal from '@/shared/components/Modal';
import { useOverlay } from '@/shared/contexts/OverlayContext';
import AddCAMGuarantorForm from './AddCAMGuarantorForm';

const AddCAMGuarantorModal: React.FC = () => {
    const { closeAddCamGuarantor } = useOverlay();

    return (
        <Modal onClose={closeAddCamGuarantor} maxWidthClass="max-w-lg">
            <AddCAMGuarantorForm />
        </Modal>
    );
};

export default AddCAMGuarantorModal;