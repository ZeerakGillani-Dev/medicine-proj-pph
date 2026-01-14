import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5001/api';

const UpdateShipmentStatus = () => {
  const [formData, setFormData] = useState({
    trackingId: '',
    notes: '',
    fromAddress: ''
  });

  const [txState, setTxState] = useState({
    status: 'idle',
    message: '',
    hash: '',
    details: null
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.trackingId.trim()) newErrors.trackingId = 'Tracking ID is required';
    if (!formData.notes.trim()) newErrors.notes = 'Notes are required';
    else if (formData.notes.trim().length < 5) newErrors.notes = 'Notes must be at least 5 characters';
    if (!formData.fromAddress.trim()) newErrors.fromAddress = 'Address is required';
    else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.fromAddress)) newErrors.fromAddress = 'Invalid Ethereum address';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setTxState({ status: 'error', message: 'Please fix form errors', hash: '', details: null });
      return;
    }

    setTxState({ status: 'loading', message: 'Submitting to blockchain...', hash: '', details: null });

    try {
      const response = await fetch(`${API_BASE_URL}/shipments/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingId: formData.trackingId.trim(),
          notes: formData.notes.trim(),
          fromAddress: formData.fromAddress.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');

      if (data.success) {
        setTxState({
          status: 'success',
          message: 'Shipment updated successfully!',
          hash: data.data.transactionHash,
          details: data.data
        });
        setTimeout(() => {
          setFormData({ trackingId: '', notes: '', fromAddress: formData.fromAddress });
        }, 3000);
      }
    } catch (err) {
      setTxState({ status: 'error', message: err.message, hash: '', details: null });
    }
  };

  const styles = {
    container: { padding: '40px 20px', maxWidth: '900px', margin: '0 auto' },
    card: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '30px' },
    header: { marginBottom: '30px', borderBottom: '2px solid #e0e0e0', paddingBottom: '20px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '8px' },
    subtitle: { fontSize: '16px', color: '#666' },
    statusBox: (status) => ({
      padding: '15px 20px',
      marginBottom: '25px',
      borderRadius: '8px',
      backgroundColor: status === 'loading' ? '#e3f2fd' : status === 'success' ? '#e8f5e9' : '#ffebee',
      border: `2px solid ${status === 'loading' ? '#2196f3' : status === 'success' ? '#4caf50' : '#f44336'}`,
      display: 'flex',
      alignItems: 'start',
      gap: '12px'
    }),
    statusIcon: { fontSize: '24px', flexShrink: 0 },
    statusContent: { flex: 1 },
    statusTitle: { fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' },
    statusMessage: { fontSize: '14px', marginBottom: '8px' },
    statusDetails: { fontSize: '12px', color: '#555', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '4px' },
    formGroup: { marginBottom: '24px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' },
    input: (hasError) => ({
      width: '100%',
      padding: '12px',
      fontSize: '15px',
      border: hasError ? '2px solid #f44336' : '1px solid #ddd',
      borderRadius: '6px',
      boxSizing: 'border-box',
      transition: 'border-color 0.3s',
      outline: 'none'
    }),
    textarea: (hasError) => ({
      width: '100%',
      padding: '12px',
      fontSize: '15px',
      border: hasError ? '2px solid #f44336' : '1px solid #ddd',
      borderRadius: '6px',
      boxSizing: 'border-box',
      resize: 'vertical',
      fontFamily: 'inherit',
      transition: 'border-color 0.3s',
      outline: 'none'
    }),
    error: { color: '#f44336', fontSize: '13px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' },
    hint: { fontSize: '13px', color: '#666', marginTop: '6px' },
    buttonContainer: { display: 'flex', gap: '12px', marginTop: '30px' },
    submitBtn: (disabled) => ({
      flex: 1,
      padding: '14px',
      fontSize: '16px',
      fontWeight: '600',
      backgroundColor: disabled ? '#ccc' : '#2196f3',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.3s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    }),
    resetBtn: { padding: '14px 24px', fontSize: '16px', fontWeight: '600', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.3s' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>📦 Update Shipment Status</h1>
          <p style={styles.subtitle}>Add real-time updates to shipments on the blockchain</p>
        </div>

        {txState.status !== 'idle' && (
          <div style={styles.statusBox(txState.status)}>
            <div style={styles.statusIcon}>
              {txState.status === 'loading' && '🔄'}
              {txState.status === 'success' && '✅'}
              {txState.status === 'error' && '❌'}
            </div>
            <div style={styles.statusContent}>
              <div style={styles.statusTitle}>
                {txState.status === 'loading' && 'Processing Transaction'}
                {txState.status === 'success' && 'Success!'}
                {txState.status === 'error' && 'Transaction Failed'}
              </div>
              <div style={styles.statusMessage}>{txState.message}</div>
              {txState.hash && (
                <div style={styles.statusDetails}>
                  <div><strong>Transaction Hash:</strong> {txState.hash.slice(0, 30)}...</div>
                </div>
              )}
              {txState.details && (
                <div style={styles.statusDetails}>
                  <strong>Block:</strong> {txState.details.blockNumber} | <strong>Gas Used:</strong> {txState.details.gasUsed?.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tracking ID *</label>
            <input
              type="text"
              name="trackingId"
              value={formData.trackingId}
              onChange={handleInputChange}
              placeholder="e.g., TRACK001"
              disabled={txState.status === 'loading'}
              style={styles.input(errors.trackingId)}
            />
            {errors.trackingId && <p style={styles.error}>⚠️ {errors.trackingId}</p>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Your Ethereum Address *</label>
            <input
              type="text"
              name="fromAddress"
              value={formData.fromAddress}
              onChange={handleInputChange}
              placeholder="0x..."
              disabled={txState.status === 'loading'}
              style={{ ...styles.input(errors.fromAddress), fontFamily: 'monospace' }}
            />
            {errors.fromAddress && <p style={styles.error}>⚠️ {errors.fromAddress}</p>}
            <p style={styles.hint}>Must be the sender or receiver of the shipment</p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Status Notes *</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              placeholder="e.g., Package received at warehouse, Quality inspection completed"
              disabled={txState.status === 'loading'}
              style={styles.textarea(errors.notes)}
            />
            {errors.notes && <p style={styles.error}>⚠️ {errors.notes}</p>}
            <p style={styles.hint}>{formData.notes.length} characters (minimum 5 required)</p>
          </div>

          <div style={styles.buttonContainer}>
            <button type="submit" disabled={txState.status === 'loading'} style={styles.submitBtn(txState.status === 'loading')}>
              {txState.status === 'loading' ? (
                <>⏳ Processing...</>
              ) : (
                <>📤 Update Status</>
              )}
            </button>
            <button 
              type="button" 
              onClick={() => { 
                setFormData({ trackingId: '', notes: '', fromAddress: '' }); 
                setErrors({}); 
                setTxState({ status: 'idle', message: '', hash: '', details: null }); 
              }} 
              disabled={txState.status === 'loading'} 
              style={styles.resetBtn}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateShipmentStatus;