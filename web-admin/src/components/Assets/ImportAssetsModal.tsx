import { Modal } from '../ui';
import { FrappeDataImportCenter } from '../Import/FrappeDataImportCenter';

interface ImportAssetsModalProps {
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categories?: any[];
    locations?: any[];
}

export function ImportAssetsModal({ opened, onClose, onSuccess }: ImportAssetsModalProps) {
    return (
        <Modal
            isOpen={opened}
            onClose={onClose}
            title="ERPQu Data Import & Export Engine (Frappe Standard)"
            size="4xl"
        >
            <FrappeDataImportCenter defaultDocType="Asset" onImportFinished={onSuccess} />
        </Modal>
    );
}
