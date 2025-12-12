import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import './Profile.css'
import {
  FiUser,
  FiKey,
  FiSave,
  FiUpload,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiLink,
  FiInfo
} from 'react-icons/fi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

interface ProfileProps {
  onBack?: () => void
}

const Profile = ({ onBack }: ProfileProps) => {
  const { user } = useAuth()
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [showSplitwiseForm, setShowSplitwiseForm] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePicture(reader.result as string)
        // TODO: Upload to backend
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    setError('')
    setMessage('')
    setLoading(true)

    try {
      // TODO: Implement backend endpoint
      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSplitwiseCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const payload: any = { api_key: apiKey }
      if (apiSecret) {
        payload.api_secret = apiSecret
      }
      
      await axios.post(`${API_URL}/splitwise/credentials`, payload)
      setMessage('Splitwise API key saved successfully!')
      setApiKey('')
      setApiSecret('')
      setShowSplitwiseForm(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h2>Profile Settings</h2>
      </div>

      <div className="profile-content">
        {/* Profile Picture Section */}
        <div className="profile-section">
          <h3 className="section-title">Profile Picture</h3>
          <div className="profile-picture-section">
            <div className="profile-picture-wrapper">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="profile-picture" />
              ) : (
                <div className="profile-picture-placeholder">
                  <FiUser className="placeholder-icon" />
                  <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                </div>
              )}
              <button
                className="upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload /> Upload Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
            {profilePicture && (
              <button
                className="remove-picture-button"
                onClick={() => setProfilePicture(null)}
              >
                <FiX /> Remove
              </button>
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="profile-section">
          <h3 className="section-title">Personal Information</h3>
          <div className="profile-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="form-input"
                placeholder="Enter your name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="form-input"
                placeholder="Enter your email"
                disabled
              />
              <small>Email cannot be changed</small>
            </div>
            <button className="primary-button" onClick={handleSaveProfile} disabled={loading}>
              {loading ? (
                <>
                  <FiRefreshCw className="spinning" /> Saving...
                </>
              ) : (
                <>
                  <FiSave /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Integrations Section */}
        <div className="profile-section">
          <h3 className="section-title">Integrations</h3>
          
          <div className="integration-card">
            <div className="integration-header">
              <div className="integration-info">
                <FiLink className="integration-icon" />
                <div>
                  <h4>Splitwise</h4>
                  <p>Import expenses from Splitwise</p>
                </div>
              </div>
              <button
                className="secondary-button"
                onClick={() => setShowSplitwiseForm(!showSplitwiseForm)}
              >
                {showSplitwiseForm ? 'Cancel' : 'Configure'}
              </button>
            </div>

            {showSplitwiseForm && (
              <div className="integration-form">
                <div className="info-card">
                  <div className="info-header">
                    <FiInfo className="info-icon" />
                    <h4>Quick Setup Guide</h4>
                  </div>
                  <p className="info-text">Use your Personal API Key from Splitwise Apps page to get started.</p>
                  <ol className="info-steps">
                    <li>
                      <span className="step-number">1</span>
                      <span>Go to <a href="https://secure.splitwise.com/apps" target="_blank" rel="noopener noreferrer" className="info-link">Splitwise Apps</a></span>
                    </li>
                    <li>
                      <span className="step-number">2</span>
                      <span>Find your application "Money manager"</span>
                    </li>
                    <li>
                      <span className="step-number">3</span>
                      <span>Copy your <strong>Personal API Key</strong></span>
                    </li>
                    <li>
                      <span className="step-number">4</span>
                      <span>Paste it in the form below</span>
                    </li>
                  </ol>
                </div>

                <form onSubmit={handleSaveSplitwiseCredentials}>
                  <div className="form-group">
                    <label htmlFor="apiKey">
                      <FiKey className="label-icon" />
                      Personal API Key (Bearer Token) *
                    </label>
                    <input
                      type="text"
                      id="apiKey"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      required
                      placeholder="Enter your Personal API Key"
                      className="form-input"
                    />
                    <small>This is your Personal API Key from Splitwise Apps page.</small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="apiSecret">
                      <FiKey className="label-icon" />
                      Consumer Secret (Optional)
                    </label>
                    <input
                      type="password"
                      id="apiSecret"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Enter Consumer Secret (only needed for OAuth flow)"
                      className="form-input"
                    />
                    <small>Only needed if implementing full OAuth flow. Leave empty for Personal API Key usage.</small>
                  </div>
                  <div className="form-actions">
                    <button type="submit" disabled={loading} className="primary-button">
                      {loading ? (
                        <>
                          <FiRefreshCw className="spinning" /> Saving...
                        </>
                      ) : (
                        <>
                          <FiCheckCircle /> Save Credentials
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSplitwiseForm(false)
                        setApiKey('')
                        setApiSecret('')
                      }}
                      className="secondary-button"
                    >
                      <FiX /> Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {message && (
          <div className="alert-message success-alert">
            <FiCheckCircle className="alert-icon" />
            {message}
          </div>
        )}
        {error && (
          <div className="alert-message error-alert">
            <FiAlertCircle className="alert-icon" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
