import { Subject, ValidationResult } from "@/types";
import { Modal } from "antd";
import { useState, useEffect } from "react";
import subjectService from "@/services/subjectService";

interface DeleteSubjectModalProps {
  subject: Subject;
  onConfirm: (subjectId: number) => void;
  onCancel: () => void;
}

export const DeleteSubjectModal: React.FC<DeleteSubjectModalProps> = ({
  subject, onConfirm, onCancel
}) => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Fetch validation data before showing modal
    const validateDeletion = async () => {
      setLoading(true);
      try {
        const result = await subjectService.validateSubjectDeletion(subject.id);
        setValidation(result);
      } catch (error) {
        console.error('Error validating subject deletion:', error);
      } finally {
        setLoading(false);
      }
    };
    
    validateDeletion();
  }, [subject.id]);
  
  return (
    <Modal
      title="Delete Subject"
      open={true}
      onCancel={onCancel}
      footer={[
        <button key="cancel" onClick={onCancel}>
          Cancel
        </button>,
        <button 
          key="confirm" 
          onClick={() => onConfirm(subject.id)}
          disabled={loading || !validation?.can_delete}
        >
          Confirm Delete
        </button>
      ]}
    >
      <div className="p-6">
        <h3>Delete Subject: {subject.name}</h3>
        {loading && <p>Loading validation data...</p>}
        {validation && (
          <div className="mt-4">
            <p>This will affect {validation.total_affected} related records:</p>
            <ul className="list-disc ml-6">
              {Object.entries(validation.related_records)
                .filter(([_, count]) => (count as number) > 0)
                .map(([type, count]) => (
                  <li key={type}>{type}: {count as number} records</li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};
