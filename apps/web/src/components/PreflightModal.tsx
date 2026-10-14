import React from 'react';
import { PreflightReport } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

interface PreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PreflightReport | null;
  isLoading: boolean;
}

export const PreflightModal: React.FC<PreflightModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color="#10b981" /> Preflight Validation Report
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
              Running preflight checks...
            </div>
          ) : report ? (
            <>
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: report.passed
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${
                    report.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                  }`
                }}
              >
                {report.passed ? (
                  <CheckCircle2 size={24} color="#10b981" />
                ) : (
                  <XCircle size={24} color="#ef4444" />
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: report.passed ? '#10b981' : '#ef4444' }}>
                    {report.passed ? 'All Preflight Checks Passed' : 'Preflight Issues Found'}
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                    Total Video Duration: <strong>{report.totalDuration.toFixed(1)}s</strong> at 30 FPS
                  </div>
                </div>
              </div>

              {report.errors.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                    Blocking Errors ({report.errors.length})
                  </div>
                  {report.errors.map((err, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: 6,
                        fontSize: 13,
                        color: '#fca5a5'
                      }}
                    >
                      • {err}
                    </div>
                  ))}
                </div>
              )}

              {report.warnings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                    Advisories & Warnings ({report.warnings.length})
                  </div>
                  {report.warnings.map((warn, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: 6,
                        fontSize: 13,
                        color: '#fcd34d'
                      }}
                    >
                      <AlertTriangle size={13} style={{ display: 'inline', marginRight: 6 }} />
                      {warn}
                    </div>
                  ))}
                </div>
              )}

              {report.errors.length === 0 && report.warnings.length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>
                  Everything is verified! Your project is fully compliant and ready to render in both 1080×1920 portrait and 1920×1080 landscape formats.
                </div>
              )}
            </>
          ) : (
            <div style={{ color: '#ef4444' }}>Unable to load report</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
