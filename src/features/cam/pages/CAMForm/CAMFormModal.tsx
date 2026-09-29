import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/shared/components/Modal';
import CamForm from './CAMForm';

const CAMFormModal: React.FC = () => {
    const navigate = useNavigate();
    const close = () => navigate(-1);

    return (
        <Modal onClose={close} maxWidthClass="max-w-2xl">
            <CamForm />
        </Modal>
    );
};

export default CAMFormModal;