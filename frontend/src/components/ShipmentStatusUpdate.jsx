import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5001/api';

const ShipmentStatusUpdate = () => {
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
    container: { padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial' },
    title: { marginBottom: '10px', color: '#333' },
    subtitle: { marginBottom: '30px', color: '#666' },
    statusBox: (status) => ({
      padding: '15px',
      marginBottom: '20px',
      borderRadius: '8px',
      backgroundColor: status === 'loading' ? '#e3f2fd' : status === 'success' ? '#e8f5e9' : '#ffebee',
      border: `2px solid ${status === 'loading' ? '#2196f3' : status === 'success' ? '#4caf50' : '#f44336'}`
    }),
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' },
    input: (hasError) => ({
      width: '100%',
      padding: '10px',
      fontSize: '16px',
      border: hasError ? '2px solid #f44336' : '1px solid #ccc',
      borderRadius: '4px',
      boxSizing: 'border-box'
    }),
    textarea: (hasError) => ({
      width: '100%',
      padding: '10px',
      fontSize: '16px',
      border: hasError ? '2px solid #f44336' : '1px solid #ccc',
      borderRadius: '4px',
      boxSizing: 'border-box',
      resize: 'vertical',
      fontFamily: 'inherit'
    }),
    error: { color: '#f44336', fontSize: '14px', marginTop: '5px' },
    buttonContainer: { display: 'flex', gap: '10px' },
    submitBtn: (disabled) => ({
      flex: 1,
      padding: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      backgroundColor: disabled ? '#ccc' : '#2196f3',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }),
    resetBtn: { padding: '12px 20px', fontSize: '16px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Update Shipment Status 📦</h1>
      <p style={styles.subtitle}>Add real-time updates to shipments on the blockchain</p>

      {txState.status !== 'idle' && (
        <div style={styles.statusBox(txState.status)}>
          <strong style={{ fontSize: '16px' }}>
            {txState.status === 'loading' && '🔄 Processing...'}
            {txState.status === 'success' && '✅ Success!'}
            {txState.status === 'error' && '❌ Error'}
          </strong>
          <p style={{ margin: '10px 0 0 0' }}>{txState.message}</p>
          {txState.hash && (
            <div style={{ marginTop: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
              <p><strong>TX Hash:</strong> {txState.hash.slice(0, 20)}...</p>
            </div>
          )}
          {txState.details && (
            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              <p><strong>Block:</strong> {txState.details.blockNumber} | <strong>Gas:</strong> {txState.details.gasUsed?.toLocaleString()}</p>
            </div>
          )}
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
            placeholder="TRACK001"
            disabled={txState.status === 'loading'}
            style={styles.input(errors.trackingId)}
          />
          {errors.trackingId && <p style={styles.error}>{errors.trackingId}</p>}
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
          {errors.fromAddress && <p style={styles.error}>{errors.fromAddress}</p>}
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Must be sender or receiver</p>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Status Notes *</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={4}
            placeholder="Package received at warehouse"
            disabled={txState.status === 'loading'}
            style={styles.textarea(errors.notes)}
          />
          {errors.notes && <p style={styles.error}>{errors.notes}</p>}
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>{formData.notes.length} characters</p>
        </div>

        <div style={styles.buttonContainer}>
          <button type="submit" disabled={txState.status === 'loading'} style={styles.submitBtn(txState.status === 'loading')}>
            {txState.status === 'loading' ? '⏳ Processing...' : '📤 Update Status'}
          </button>
          <button type="button" onClick={() => { setFormData({ trackingId: '', notes: '', fromAddress: '' }); setErrors({}); setTxState({ status: 'idle', message: '', hash: '', details: null }); }} disabled={txState.status === 'loading'} style={styles.resetBtn}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShipmentStatusUpdate;