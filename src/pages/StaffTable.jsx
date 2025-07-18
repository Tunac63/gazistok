// src/pages/StaffTable.jsx - Tablo formatında personel listesi

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { ref, onValue, set, remove, push, get } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';
import * as XLSX from 'xlsx';

const StaffTable = ({ 
  staffList = [], 
  isAdmin = false, 
  filterType = 'active',
  onEdit,
  onToggleStatus,
  onDelete,
  onViewModeChange,
  showWarning
}) => {
  const navigate = useNavigate();

  const getFilteredStaff = () => {
    return staffList.filter(staff => {
      if (filterType === 'active') return staff.isActive;
      if (filterType === 'inactive') return !staff.isActive;
      return true;
    });
  };

  return (
    <div style={{ 
      overflow: 'auto',
      borderRadius: window.innerWidth <= 768 ? '8px' : '12px',
      border: window.innerWidth <= 768 ? '1px solid #e2e8f0' : 'none',
      maxHeight: window.innerWidth <= 768 ? '70vh' : 'auto'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: window.innerWidth <= 768 ? '10px' : '14px',
        minWidth: window.innerWidth <= 768 ? '800px' : 'auto'
      }}>
        <thead>
          <tr style={{ 
            backgroundColor: '#f8fafc',
            borderBottom: '2px solid #e2e8f0'
          }}>
            <th style={{ 
              padding: window.innerWidth <= 768 ? '10px 6px' : '15px 12px', 
              textAlign: 'left', 
              fontWeight: '600', 
              color: '#374151',
              minWidth: window.innerWidth <= 768 ? '140px' : '180px'
            }}>
              👤 Ad Soyad
            </th>
            <th style={{ 
              padding: window.innerWidth <= 768 ? '10px 6px' : '15px 12px', 
              textAlign: 'left', 
              fontWeight: '600', 
              color: '#374151',
              minWidth: window.innerWidth <= 768 ? '90px' : '120px'
            }}>
              🏢 Alan
            </th>
            <th style={{ 
              padding: window.innerWidth <= 768 ? '10px 6px' : '15px 12px', 
              textAlign: 'left', 
              fontWeight: '600', 
              color: '#374151',
              minWidth: window.innerWidth <= 768 ? '90px' : '120px'
            }}>
              💼 Pozisyon
            </th>
            <th style={{ 
              padding: window.innerWidth <= 768 ? '10px 6px' : '15px 12px', 
              textAlign: 'center', 
              fontWeight: '600', 
              color: '#374151',
              minWidth: window.innerWidth <= 768 ? '90px' : '120px'
            }}>
              📅 İşe Giriş
            </th>
            <th style={{ 
              padding: '15px 12px', 
              textAlign: 'center', 
              fontWeight: '600', 
              color: '#374151',
              minWidth: '120px'
            }}>
              🚪 İşten Çıkış
            </th>
            <th style={{ 
              padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
              textAlign: 'center', 
              fontWeight: '600', 
              color: '#374151',
              minWidth: window.innerWidth <= 768 ? '100px' : '120px',
              fontSize: window.innerWidth <= 768 ? '11px' : '14px'
            }}>
              🏥 SGK Tarihi
            </th>
            <th style={{ 
              padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
              textAlign: 'center', 
              fontWeight: '600', 
              color: '#374151',
              minWidth: window.innerWidth <= 768 ? '100px' : '120px',
              fontSize: window.innerWidth <= 768 ? '11px' : '14px'
            }}>
              📱 Telefon
            </th>
            <th style={{ 
              padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
              textAlign: 'center', 
              fontWeight: '600', 
              color: '#374151',
              minWidth: window.innerWidth <= 768 ? '60px' : '80px',
              fontSize: window.innerWidth <= 768 ? '11px' : '14px'
            }}>
              📊 Durum
            </th>
            <th style={{ 
              padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
              textAlign: 'center', 
              fontWeight: '600', 
              color: '#374151',
              minWidth: window.innerWidth <= 768 ? '120px' : '150px',
              fontSize: window.innerWidth <= 768 ? '11px' : '14px'
            }}>
              ⚙️ İşlemler
            </th>
          </tr>
        </thead>
        <tbody>
          {getFilteredStaff().map((staff, index) => (
            <tr key={staff.id} style={{ 
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc'
            }}>
              <td style={{ 
                padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
                fontWeight: '600', 
                color: '#1f2937',
                fontSize: window.innerWidth <= 768 ? '11px' : '14px'
              }}>
                {staff.fullName}
              </td>
              <td style={{ 
                padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
                color: '#374151',
                fontSize: window.innerWidth <= 768 ? '11px' : '14px'
              }}>
                <span style={{
                  background: staff.workArea === 'Salon' ? '#dbeafe' : 
                            staff.workArea === 'Bar' ? '#fef3c7' : '#dcfce7',
                  color: staff.workArea === 'Salon' ? '#1e40af' :
                        staff.workArea === 'Bar' ? '#92400e' : '#166534',
                  padding: window.innerWidth <= 768 ? '2px 6px' : '4px 8px',
                  borderRadius: '6px',
                  fontSize: window.innerWidth <= 768 ? '10px' : '12px',
                  fontWeight: '600'
                }}>
                  {staff.workArea}
                </span>
              </td>
              <td style={{ 
                padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
                color: '#374151',
                fontSize: window.innerWidth <= 768 ? '11px' : '14px'
              }}>
                {staff.position || '-'}
              </td>
              <td style={{ 
                padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
                textAlign: 'center', 
                color: '#374151',
                fontSize: window.innerWidth <= 768 ? '11px' : '14px'
              }}>
                {staff.startDate ? new Date(staff.startDate).toLocaleDateString('tr-TR') : '-'}
              </td>
              <td style={{ 
                padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
                textAlign: 'center',
                fontSize: window.innerWidth <= 768 ? '11px' : '14px'
              }}>
                {!staff.isActive && staff.exitDate ? (
                  <span style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: window.innerWidth <= 768 ? '2px 6px' : '4px 8px',
                    borderRadius: '6px',
                    fontSize: window.innerWidth <= 768 ? '10px' : '12px',
                    fontWeight: '600'
                  }}>
                    {new Date(staff.exitDate).toLocaleDateString('tr-TR')}
                  </span>
                ) : (
                  <span style={{ 
                    color: '#94a3b8', 
                    fontSize: window.innerWidth <= 768 ? '10px' : '12px'
                  }}>
                    {staff.isActive ? 'Aktif' : '-'}
                  </span>
                )}
              </td>
              <td style={{ 
                padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
                textAlign: 'center',
                fontSize: window.innerWidth <= 768 ? '11px' : '14px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: window.innerWidth <= 768 ? '4px' : '8px',
                  flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
                }}>
                  <span style={{ 
                    color: staff.sgkStartDate ? '#166534' : '#92400e',
                    fontWeight: '600',
                    fontSize: window.innerWidth <= 768 ? '10px' : '12px'
                  }}>
                    {staff.sgkStartDate ? new Date(staff.sgkStartDate).toLocaleDateString('tr-TR') : '-'}
                  </span>
                  <button
                    onClick={() => {
                      if (!isAdmin) {
                        showWarning && showWarning('Bu işlem için admin yetkisi gereklidir!');
                        return;
                      }
                      onEdit && onEdit(staff);
                    }}
                    style={{
                      background: isAdmin 
                        ? (staff.sgkStartDate ? 'rgba(22, 101, 52, 0.1)' : 'rgba(146, 64, 14, 0.1)')
                        : 'rgba(160, 160, 160, 0.1)',
                      border: isAdmin 
                        ? `1px solid ${staff.sgkStartDate ? '#22c55e' : '#f59e0b'}`
                        : '1px solid #a0a0a0',
                      borderRadius: '4px',
                      color: isAdmin 
                        ? (staff.sgkStartDate ? '#166534' : '#92400e')
                        : '#a0a0a0',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      opacity: isAdmin ? 1 : 0.6
                    }}
                  >
                    {isAdmin 
                      ? (staff.sgkStartDate ? '✏️' : '📝')
                      : '🔒'
                    }
                  </button>
                </div>
              </td>
              <td style={{ 
                padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
                textAlign: 'center', 
                color: '#374151', 
                fontSize: window.innerWidth <= 768 ? '10px' : '12px'
              }}>
                {staff.phone || '-'}
              </td>
              <td style={{ 
                padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
                textAlign: 'center',
                fontSize: window.innerWidth <= 768 ? '11px' : '14px'
              }}>
                <span style={{
                  background: staff.isActive ? '#dcfce7' : '#fee2e2',
                  color: staff.isActive ? '#166534' : '#dc2626',
                  padding: window.innerWidth <= 768 ? '2px 6px' : '4px 8px',
                  borderRadius: '12px',
                  fontSize: window.innerWidth <= 768 ? '9px' : '11px',
                  fontWeight: '600'
                }}>
                  {staff.isActive ? '✅ Aktif' : '❌ Ayrıldı'}
                </span>
              </td>
              <td style={{ 
                padding: window.innerWidth <= 768 ? '8px 4px' : '15px 12px', 
                textAlign: 'center',
                fontSize: window.innerWidth <= 768 ? '11px' : '14px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  gap: window.innerWidth <= 768 ? '2px' : '4px', 
                  justifyContent: 'center', 
                  flexWrap: 'wrap',
                  flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
                }}>
                  <button
                    onClick={() => {
                      if (!isAdmin) {
                        showWarning && showWarning('Bu işlem için admin yetkisi gereklidir!');
                        return;
                      }
                      onEdit && onEdit(staff);
                    }}
                    style={{
                      background: isAdmin 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                        : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      padding: window.innerWidth <= 768 ? '4px 8px' : '6px 10px',
                      fontSize: window.innerWidth <= 768 ? '8px' : '10px',
                      fontWeight: '600',
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      opacity: isAdmin ? 1 : 0.6,
                      minWidth: window.innerWidth <= 768 ? '20px' : '24px'
                    }}
                  >
                    {isAdmin ? '✏️' : '🔒'}
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!isAdmin) {
                        showWarning && showWarning('Bu işlem için admin yetkisi gereklidir!');
                        return;
                      }
                      onToggleStatus && onToggleStatus(staff);
                    }}
                    style={{
                      background: isAdmin 
                        ? (staff.isActive 
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)')
                        : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      padding: window.innerWidth <= 768 ? '4px 8px' : '6px 10px',
                      fontSize: window.innerWidth <= 768 ? '8px' : '10px',
                      fontWeight: '600',
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      opacity: isAdmin ? 1 : 0.6,
                      minWidth: window.innerWidth <= 768 ? '20px' : '24px'
                    }}
                  >
                    {isAdmin 
                      ? (staff.isActive ? '🚪' : '🔄')
                      : '🔒'
                    }
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!isAdmin) {
                        showWarning && showWarning('Bu işlem için admin yetkisi gereklidir!');
                        return;
                      }
                      onDelete && onDelete(staff.id, staff.fullName);
                    }}
                    style={{
                      background: isAdmin 
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      padding: window.innerWidth <= 768 ? '4px 6px' : '6px 8px',
                      fontSize: window.innerWidth <= 768 ? '8px' : '10px',
                      fontWeight: '600',
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      opacity: isAdmin ? 1 : 0.6,
                      minWidth: window.innerWidth <= 768 ? '20px' : '24px'
                    }}
                  >
                    {isAdmin ? '🗑️' : '🔒'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StaffTable;
