import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  FiLogOut, 
  FiDollarSign,
  FiUsers,
  FiPlus,
  FiTrendingUp,
  FiTrendingDown,
  FiSettings,
  FiMenu,
  FiX,
  FiUser,
  FiDownload
} from 'react-icons/fi'
import logo from '../logo.png'
import './Navbar.css'

interface NavbarProps {
  onAddExpense: () => void
  onAddIncome: () => void
  onCreateGroup: () => void
}

const Navbar = ({ onAddExpense, onAddIncome, onCreateGroup }: NavbarProps) => {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/dashboard' || path === '/') return 'dashboard'
    if (path === '/groups') return 'groups'
    if (path === '/expenses') return 'expenses'
    if (path === '/income') return 'income'
    if (path === '/import') return 'import'
    if (path === '/profile') return 'profile'
    return 'dashboard'
  }
  
  const activeTab = getActiveTab()

  return (
    <nav className="modern-navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-logo">
            <img src={logo} alt="MyKaasu Logo" className="logo-image" />
          </div>
          <div className="brand-text">
            <h1>MyKaasu</h1>
          </div>
        </div>

        <div className={`navbar-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link
            to="/dashboard"
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <FiDollarSign className="nav-icon" />
            <span>Dashboard</span>
          </Link>
          
          <Link
            to="/groups"
            className={`nav-item ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <FiUsers className="nav-icon" />
            <span>Groups</span>
          </Link>
          
          <Link
            to="/expenses"
            className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <FiTrendingDown className="nav-icon" />
            <span>Expenses</span>
          </Link>
          
          <Link
            to="/income"
            className={`nav-item ${activeTab === 'income' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <FiTrendingUp className="nav-icon" />
            <span>Income</span>
          </Link>
          
          <Link
            to="/import"
            className={`nav-item ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <FiDownload className="nav-icon" />
            <span>Import</span>
          </Link>
          
          <Link
            to="/profile"
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <FiUser className="nav-icon" />
            <span>Profile</span>
          </Link>
        </div>

        <div className="navbar-actions">
          <div className="quick-actions">
            <button className="action-btn add-expense" onClick={onAddExpense} title="Add Expense">
              <FiPlus />
            </button>
            <button className="action-btn add-income" onClick={onAddIncome} title="Add Income">
              <FiTrendingUp />
            </button>
            <button className="action-btn create-group" onClick={onCreateGroup} title="Create Group">
              <FiUsers />
            </button>
          </div>
          
          <div className="user-menu">
            <div className="user-info">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="user-name">{user?.name}</span>
            </div>
            <button className="logout-btn" onClick={logout} title="Logout">
              <FiLogOut />
            </button>
          </div>
        </div>

        <button 
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </nav>
  )
}

export default Navbar
