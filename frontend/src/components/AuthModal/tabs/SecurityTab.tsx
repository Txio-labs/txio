import React, { useState } from 'react';
import { appStore } from '../../../lib/store';
import { apiClient } from '../../../lib/api';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const SecurityTab: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordFormVisible, setIsPasswordFormVisible] = useState(false);
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<PasswordFormData>>({});

  const validatePasswordForm = (): boolean => {
    const newErrors: Partial<PasswordFormData> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'New password must be at least 8 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordRotation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/update-password', {
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword,
      });

      if (response.data.success) {
        appStore.showToast('Password rotated successfully!', 'success');
        // Reset form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setIsPasswordFormVisible(false);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to rotate password';
      appStore.showToast(errorMessage, 'error');
      setErrors({
        currentPassword: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof PasswordFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="security-tab">
      {/* Password Rotation Card */}
      <div className="security-card">
        <div className="security-card-header">
          <h3>Password Rotation</h3>
          <p className="security-card-description">
            Keep credential lifetime short and rotate keys before your environment becomes sticky.
          </p>
        </div>

        {!isPasswordFormVisible ? (
          <button
            onClick={() => setIsPasswordFormVisible(true)}
            className="btn btn-primary"
          >
            Rotate Password
          </button>
        ) : (
          <form onSubmit={handlePasswordRotation} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleInputChange('currentPassword')}
                className={`form-input ${errors.currentPassword ? 'error' : ''}`}
                placeholder="Enter your current password"
                disabled={isLoading}
              />
              {errors.currentPassword && (
                <span className="error-message">{errors.currentPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleInputChange('newPassword')}
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                placeholder="Enter your new password (min 8 characters)"
                disabled={isLoading}
              />
              {errors.newPassword && (
                <span className="error-message">{errors.newPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your new password"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setIsPasswordFormVisible(false);
                  setFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                  setErrors({});
                }}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .security-tab {
          padding: 20px;
        }

        .security-card {
          background: var(--bg-card, #fff);
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .security-card-header {
          margin-bottom: 16px;
        }

        .security-card-header h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .security-card-description {
          margin: 0;
          color: var(--text-secondary, #666);
          font-size: 14px;
        }

        .password-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #333);
        }

        .form-input {
          padding: 10px 12px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary-color, #0066cc);
          box-shadow: 0 0 0 2px rgba(0,102,204,0.1);
        }

        .form-input.error {
          border-color: var(--error-color, #dc3545);
        }

        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          color: var(--error-color, #dc3545);
          font-size: 12px;
          margin-top: 4px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: var(--primary-color, #0066cc);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--primary-hover, #0052a3);
        }

        .btn-secondary {
          background: var(--bg-secondary, #f0f0f0);
          color: var(--text-primary, #333);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--bg-hover, #e0e0e0);
        }
      `}</style>
    </div>
  );
};
