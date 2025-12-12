import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import Navbar from './Navbar'
import Profile from './Profile'
import ImportPage from './ImportPage'
import './Dashboard.css'
import { 
  FiDollarSign,
  FiTrendingDown,
  FiTag,
  FiX,
  FiCreditCard,
  FiClock,
  FiPlus,
  FiEdit2,
  FiUsers,
  FiTrendingUp,
  FiMove,
  FiSave,
  FiDownload,
  FiFilter,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

interface Expense {
  id: string
  description: string
  amount: number
  currency: string
  date: string
  category?: string
  expense_type?: string
  expense_title?: string
  net_balance?: number
  total_expense?: number
  owed_share?: number
  group_id?: string
  group_name?: string
}

interface Group {
  id: string
  name: string
  description?: string
  color?: string
  created_at: string
  expense_count?: number
}

interface Income {
  id: string
  description: string
  amount: number
  currency: string
  date: string
  category?: string
  source?: string
}

const Dashboard = () => {
  const { } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  
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
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [draggedExpense, setDraggedExpense] = useState<Expense | null>(null)
  
  // Pagination state
  const [expensesPage, setExpensesPage] = useState(1)
  const [expensesLimit] = useState(20)
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [expensesTotalPages, setExpensesTotalPages] = useState(1)
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  
  // Form states
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    category: '',
    group_id: ''
  })
  
  const [incomeForm, setIncomeForm] = useState({
    description: '',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    category: '',
    source: ''
  })
  
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    color: '#10b981'
  })

  const suggestedGroups = [
    { name: 'Household', description: 'Home expenses and utilities', color: '#10b981' },
    { name: 'Travel', description: 'Trips and vacations', color: '#3b82f6' },
    { name: 'Food & Dining', description: 'Restaurants and groceries', color: '#f59e0b' },
    { name: 'Transportation', description: 'Gas, parking, and transit', color: '#8b5cf6' },
    { name: 'Entertainment', description: 'Movies, concerts, and fun activities', color: '#ec4899' },
    { name: 'Shopping', description: 'Clothing and personal items', color: '#ef4444' },
    { name: 'Health & Fitness', description: 'Medical and gym expenses', color: '#06b6d4' },
    { name: 'Bills & Utilities', description: 'Monthly bills and services', color: '#14b8a6' },
    { name: 'Work', description: 'Work-related expenses', color: '#6366f1' },
    { name: 'Family & Friends', description: 'Expenses shared with loved ones', color: '#f97316' }
  ]

  useEffect(() => {
    fetchExpenses()
    fetchGroups()
    fetchIncome()
  }, [])

  const fetchExpenses = async (page: number = expensesPage) => {
    try {
      setLoadingExpenses(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/expenses?page=${page}&limit=${expensesLimit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const expensesData = response.data.expenses || []
      // Ensure each expense has an id field
      const expensesWithId = expensesData.map((expense: any) => ({
        ...expense,
        id: expense.id || expense._id || expense.splitwise_id || `expense-${Date.now()}-${Math.random()}`
      }))
      setExpenses(expensesWithId)
      setExpensesTotal(response.data.total || 0)
      setExpensesTotalPages(response.data.total_pages || 1)
      setExpensesPage(page)
    } catch (err) {
      console.error('Error fetching expenses:', err)
    } finally {
      setLoadingExpenses(false)
    }
  }

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      setGroups(response.data.groups || [])
    } catch (err) {
      console.error('Error fetching groups:', err)
    }
  }

  const fetchIncome = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/income`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      setIncome(response.data.income || [])
    } catch (err) {
      console.error('Error fetching income:', err)
    }
  }

  const handleAddExpense = () => {
    setEditingExpense(null)
    setExpenseForm({
      description: '',
      amount: '',
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      category: '',
      group_id: ''
    })
    setShowExpenseModal(true)
  }

  const handleAddIncome = () => {
    setIncomeForm({
      description: '',
      amount: '',
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      category: '',
      source: ''
    })
    setShowIncomeModal(true)
  }

  const handleCreateGroup = () => {
    setGroupForm({
      name: '',
      description: '',
      color: '#10b981'
    })
    setShowGroupModal(true)
  }

  const handleSaveExpense = async () => {
    try {
      const token = localStorage.getItem('token')
      const expenseData = {
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        currency: expenseForm.currency,
        date: expenseForm.date,
        category: expenseForm.category,
        group_id: expenseForm.group_id,
        group_name: groups.find(g => g.id === expenseForm.group_id)?.name || '',
        owed_share: parseFloat(expenseForm.amount)
      }

      if (editingExpense) {
        await axios.put(`${API_URL}/expenses/${editingExpense.id}`, expenseData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      } else {
        await axios.post(`${API_URL}/expenses`, expenseData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
      
      setShowExpenseModal(false)
      setEditingExpense(null)
      setExpenseForm({
        description: '',
        amount: '',
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        category: '',
        group_id: ''
      })
      await fetchExpenses(expensesPage)
      await fetchGroups()
    } catch (err: any) {
      console.error('Error saving expense:', err)
      alert(err.response?.data?.detail || 'Failed to save expense')
    }
  }

  const handleSaveIncome = async () => {
    try {
      const token = localStorage.getItem('token')
      const incomeData = {
        description: incomeForm.description,
        amount: parseFloat(incomeForm.amount),
        currency: incomeForm.currency,
        date: incomeForm.date,
        category: incomeForm.category,
        source: incomeForm.source
      }

      await axios.post(`${API_URL}/income`, incomeData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      setShowIncomeModal(false)
      setIncomeForm({
        description: '',
        amount: '',
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        category: '',
        source: ''
      })
      await fetchIncome()
    } catch (err: any) {
      console.error('Error saving income:', err)
      alert(err.response?.data?.detail || 'Failed to save income')
    }
  }

  const handleSaveGroup = async () => {
    try {
      const token = localStorage.getItem('token')
      const groupData = {
        name: groupForm.name,
        description: groupForm.description,
        color: groupForm.color
      }

      await axios.post(`${API_URL}/groups`, groupData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      setShowGroupModal(false)
      setGroupForm({ name: '', description: '', color: '#10b981' })
      await fetchGroups()
    } catch (err: any) {
      console.error('Error saving group:', err)
      alert(err.response?.data?.detail || 'Failed to save group')
    }
  }

  const handleClearExpense = async (expenseId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (!window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/expenses/${expenseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      await fetchExpenses()
    } catch (err: any) {
      console.error('Error deleting expense:', err)
      alert('Failed to delete expense. Please try again.')
    }
  }

  const handleDeleteIncome = async (incomeId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (!window.confirm('Are you sure you want to delete this income? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/income/${incomeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      await fetchIncome()
    } catch (err: any) {
      console.error('Error deleting income:', err)
      alert('Failed to delete income. Please try again.')
    }
  }


  const handleDragStart = (expense: Expense) => {
    setDraggedExpense(expense)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (groupId: string) => {
    if (draggedExpense) {
      // TODO: Update expense with group_id via backend
      setExpenses(expenses.map(e => 
        e.id === draggedExpense.id ? { ...e, group_id: groupId, group_name: groups.find(g => g.id === groupId)?.name } : e
      ))
      setDraggedExpense(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount)
  }

  // Calculate summary values - use all expenses from backend
  const totalIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0)
  const youOwe = expenses.reduce((sum, e) => sum + (e.owed_share || 0), 0)
  const netBalance = totalIncome - youOwe

  // Combine expenses and income into transactions
  type Transaction = (Expense & { type: 'expense' }) | (Income & { type: 'income' })
  const transactions: Transaction[] = [
    ...expenses.map(e => ({ ...e, type: 'expense' as const })),
    ...income.map(i => ({ ...i, type: 'income' as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="money-manager-app">
      <Navbar 
        onAddExpense={handleAddExpense}
        onAddIncome={handleAddIncome}
        onCreateGroup={handleCreateGroup}
      />

      <div className="app-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card income-card">
                <div className="summary-card-icon income-icon">
                  <FiTrendingUp />
                </div>
                <div className="summary-card-content">
                  <h3>Total Income</h3>
                  <p className="summary-amount">{formatCurrency(totalIncome, 'USD')}</p>
                </div>
              </div>

              <div className="summary-card owe-card">
                <div className="summary-card-icon owe-icon">
                  <FiTrendingDown />
                </div>
                <div className="summary-card-content">
                  <h3>Total Expense (You Owe)</h3>
                  <p className="summary-amount">{formatCurrency(youOwe, 'USD')}</p>
                </div>
              </div>

              <div className="summary-card balance-card">
                <div className="summary-card-icon balance-icon">
                  <FiDollarSign />
                </div>
                <div className="summary-card-content">
                  <h3>Net Balance</h3>
                  <p className={`summary-amount ${netBalance >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(netBalance, 'USD')}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
              <h2 className="section-title">Quick Actions</h2>
              <div className="quick-action-cards">
                <button className="quick-action-card" onClick={handleAddExpense}>
                  <FiPlus className="action-icon" />
                  <span>Add Expense</span>
                </button>
                <button className="quick-action-card" onClick={handleAddIncome}>
                  <FiTrendingUp className="action-icon" />
                  <span>Add Income</span>
                </button>
                <button className="quick-action-card" onClick={handleCreateGroup}>
                  <FiUsers className="action-icon" />
                  <span>Create Group</span>
                </button>
                <button className="quick-action-card" onClick={() => navigate('/import')}>
                  <FiDownload className="action-icon" />
                  <span>Import from Splitwise</span>
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="recent-section">
              <div className="section-header-with-action">
                <h2 className="section-title">Recent Transactions</h2>
              </div>
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <FiCreditCard className="empty-icon" />
                  <p>No transactions found. Add your first expense or income to get started!</p>
                </div>
              ) : (
                <div className="expenses-list">
                  {transactions.map((transaction) => {
                    if (transaction.type === 'income') {
                      return (
                        <div key={`income-${transaction.id}`} className="expense-card expense-income">
                          <div className="expense-card-header">
                            <div className="expense-icon-wrapper">
                              <FiTrendingUp className="expense-icon income-icon" />
                            </div>
                            <div className="expense-content">
                              <h3 className="expense-title">{transaction.description}</h3>
                              <span className="expense-badge income-badge">Income</span>
                            </div>
                            <div className="expense-amount-wrapper">
                              <span className="expense-amount amount-income">
                                +{formatCurrency(transaction.amount, transaction.currency)}
                              </span>
                            </div>
                            <button 
                              className="expense-delete-btn"
                              onClick={(e) => handleDeleteIncome(transaction.id, e)}
                              title="Delete income"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                          <div className="expense-footer">
                            <span className="expense-date">
                              <FiClock className="date-icon" />
                              {formatDate(transaction.date)}
                            </span>
                            {transaction.category && (
                              <span className="expense-category">
                                <FiTag className="category-icon" />
                                {transaction.category}
                              </span>
                            )}
                            {transaction.source && (
                              <span className="expense-category">
                                <FiDollarSign className="category-icon" />
                                {transaction.source}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    } else {
                      return (
                        <div key={`expense-${transaction.id}`} className="expense-card expense-borrowed">
                          <div className="expense-card-header">
                            <div className="expense-icon-wrapper">
                              <FiTrendingDown className="expense-icon borrowed-icon" />
                            </div>
                            <div className="expense-content">
                              <h3 className="expense-title">{transaction.description}</h3>
                              <span className="expense-badge">
                                {transaction.expense_type === "borrowed" ? 'Others Paid' : transaction.expense_type === "lent" ? 'You Paid' : 'Your Share'}
                              </span>
                            </div>
                            <div className="expense-amount-wrapper">
                              {transaction.owed_share !== undefined && transaction.owed_share > 0 && (
                                <span className="expense-amount amount-lent">
                                  -{formatCurrency(transaction.owed_share, transaction.currency)}
                                </span>
                              )}
                            </div>
                            <button 
                              className="expense-delete-btn"
                              onClick={(e) => handleClearExpense(transaction.id, e)}
                              title="Delete expense"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                          {transaction.total_expense && (
                            <div className="expense-total">
                              <FiDollarSign className="total-icon" />
                              <span>Total: {formatCurrency(transaction.total_expense, transaction.currency)}</span>
                            </div>
                          )}
                          <div className="expense-footer">
                            <span className="expense-date">
                              <FiClock className="date-icon" />
                              {formatDate(transaction.date)}
                            </span>
                            {transaction.category && (
                              <span className="expense-category">
                                <FiTag className="category-icon" />
                                {transaction.category}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    }
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="groups-tab">
            <div className="tab-header">
              <h2>Groups</h2>
              <button className="primary-button" onClick={handleCreateGroup}>
                <FiPlus /> Create Group
              </button>
            </div>
            
            {groups.length === 0 ? (
              <div className="empty-state">
                <FiUsers className="empty-icon" />
                <p>No groups yet. Create your first group to organize expenses!</p>
              </div>
            ) : (
              <div className="groups-grid">
                {groups.map((group) => (
                  <div 
                    key={group.id} 
                    className="group-card"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(group.id)}
                  >
                    <div className="group-header" style={{ borderLeftColor: group.color }}>
                      <div className="group-info">
                        <h3>{group.name}</h3>
                        {group.description && <p>{group.description}</p>}
                      </div>
                      <div className="group-stats">
                        <span className="group-expense-count">{group.expense_count || 0} expenses</span>
                      </div>
                    </div>
                    <div className="group-actions">
                      <button className="action-btn-edit">
                        <FiEdit2 /> Edit
                      </button>
                      <button className="action-btn-view">
                        View Expenses
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="expenses-tab">
            <div className="tab-header">
              <h2>All Expenses ({expensesTotal})</h2>
              <div className="header-actions">
                <button className="secondary-button">
                  <FiFilter /> Filter
                </button>
                <button className="primary-button" onClick={handleAddExpense}>
                  <FiPlus /> Add Expense
                </button>
              </div>
            </div>
            
            {loadingExpenses ? (
              <div className="empty-state">
                <FiClock className="empty-icon spinning" />
                <p>Loading expenses...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="empty-state">
                <FiTrendingDown className="empty-icon" />
                <p>No expenses found. Add your first expense!</p>
              </div>
            ) : (
              <>
                <div className="expenses-list">
                  {expenses.map((expense) => (
                  <div 
                    key={expense.id} 
                    className="expense-card expense-borrowed"
                    draggable
                    onDragStart={() => handleDragStart(expense)}
                  >
                    <div className="expense-drag-handle">
                      <FiMove />
                    </div>
                    <div className="expense-card-header">
                      <div className="expense-icon-wrapper">
                        <FiTrendingDown className="expense-icon borrowed-icon" />
                      </div>
                      <div className="expense-content">
                        <h3 className="expense-title">{expense.description}</h3>
                        <span className="expense-badge">
                          {expense.expense_type === "borrowed" ? 'Others Paid' : expense.expense_type === "lent" ? 'You Paid' : 'Your Share'}
                        </span>
                      </div>
                      <div className="expense-amount-wrapper">
                        {expense.owed_share !== undefined && expense.owed_share > 0 && (
                          <span className="expense-amount amount-lent">
                            -{formatCurrency(expense.owed_share, expense.currency)}
                          </span>
                        )}
                      </div>
                      <button className="expense-edit-btn" onClick={() => {
                        setEditingExpense(expense)
                        setExpenseForm({
                          description: expense.description,
                          amount: expense.amount?.toString() || expense.owed_share?.toString() || '',
                          currency: expense.currency,
                          date: expense.date.split('T')[0],
                          category: expense.category || '',
                          group_id: expense.group_id || ''
                        })
                        setShowExpenseModal(true)
                      }}>
                        <FiEdit2 />
                      </button>
                      <button 
                        className="expense-delete-btn"
                        onClick={(e) => handleClearExpense(expense.id, e)}
                        title="Delete expense"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    {expense.total_expense && (
                      <div className="expense-total">
                        <FiDollarSign className="total-icon" />
                        <span>Total: {formatCurrency(expense.total_expense, expense.currency)}</span>
                      </div>
                    )}
                    <div className="expense-footer">
                      <span className="expense-date">
                        <FiClock className="date-icon" />
                        {formatDate(expense.date)}
                      </span>
                      {expense.category && (
                        <span className="expense-category">
                          <FiTag className="category-icon" />
                          {expense.category}
                        </span>
                      )}
                      {expense.group_name && (
                        <span className="expense-group">
                          <FiUsers className="group-icon" />
                          {expense.group_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                </div>
                {expensesTotalPages > 1 && (
                  <div className="pagination">
                    <button 
                      className="pagination-btn"
                      onClick={() => fetchExpenses(expensesPage - 1)}
                      disabled={expensesPage === 1}
                    >
                      <FiChevronLeft /> Previous
                    </button>
                    <span className="pagination-info">
                      Page {expensesPage} of {expensesTotalPages}
                    </span>
                    <button 
                      className="pagination-btn"
                      onClick={() => fetchExpenses(expensesPage + 1)}
                      disabled={expensesPage >= expensesTotalPages}
                    >
                      Next <FiChevronRight />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'income' && (
          <div className="income-tab">
            <div className="tab-header">
              <h2>Income</h2>
              <button className="primary-button" onClick={handleAddIncome}>
                <FiPlus /> Add Income
              </button>
            </div>
            
            {income.length === 0 ? (
              <div className="empty-state">
                <FiTrendingUp className="empty-icon" />
                <p>No income records yet. Add your first income source!</p>
              </div>
            ) : (
              <div className="income-list">
                {income.map((item) => (
                  <div key={item.id} className="income-card">
                    <div className="income-header">
                      <div className="income-icon-wrapper">
                        <FiTrendingUp className="income-icon" />
                      </div>
                      <div className="income-content">
                        <h3>{item.description}</h3>
                        {item.source && <span className="income-source">{item.source}</span>}
                      </div>
                      <div className="income-amount">
                        {formatCurrency(item.amount, item.currency)}
                      </div>
                      <button 
                        className="expense-delete-btn"
                        onClick={(e) => handleDeleteIncome(item.id, e)}
                        title="Delete income"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <div className="income-footer">
                      <span className="income-date">
                        <FiClock className="date-icon" />
                        {formatDate(item.date)}
                      </span>
                      {item.category && (
                        <span className="income-category">
                          <FiTag className="category-icon" />
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <Profile />
        )}

        {activeTab === 'import' && (
          <ImportPage onExpenseAdded={() => fetchExpenses(expensesPage)} />
        )}

        {/* Modals */}
        {showExpenseModal && (
          <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h3>
                <button className="close-btn" onClick={() => setShowExpenseModal(false)}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Description *</label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="form-input"
                    placeholder="Enter expense description"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Amount *</label>
                    <input
                      type="number"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      className="form-input"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      value={expenseForm.currency}
                      onChange={(e) => setExpenseForm({...expenseForm, currency: e.target.value})}
                      className="form-input"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                      className="form-input"
                      placeholder="e.g., Food, Travel"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Group</label>
                  <select
                    value={expenseForm.group_id}
                    onChange={(e) => setExpenseForm({...expenseForm, group_id: e.target.value})}
                    className="form-input"
                  >
                    <option value="">No Group</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="secondary-button" onClick={() => setShowExpenseModal(false)}>
                  Cancel
                </button>
                <button className="primary-button" onClick={handleSaveExpense}>
                  <FiSave /> Save Expense
                </button>
              </div>
            </div>
          </div>
        )}

        {showIncomeModal && (
          <div className="modal-overlay" onClick={() => setShowIncomeModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add Income</h3>
                <button className="close-btn" onClick={() => setShowIncomeModal(false)}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Description *</label>
                  <input
                    type="text"
                    value={incomeForm.description}
                    onChange={(e) => setIncomeForm({...incomeForm, description: e.target.value})}
                    className="form-input"
                    placeholder="Enter income description"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Amount *</label>
                    <input
                      type="number"
                      value={incomeForm.amount}
                      onChange={(e) => setIncomeForm({...incomeForm, amount: e.target.value})}
                      className="form-input"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      value={incomeForm.currency}
                      onChange={(e) => setIncomeForm({...incomeForm, currency: e.target.value})}
                      className="form-input"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={incomeForm.date}
                      onChange={(e) => setIncomeForm({...incomeForm, date: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Source</label>
                    <input
                      type="text"
                      value={incomeForm.source}
                      onChange={(e) => setIncomeForm({...incomeForm, source: e.target.value})}
                      className="form-input"
                      placeholder="e.g., Salary, Freelance"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={incomeForm.category}
                    onChange={(e) => setIncomeForm({...incomeForm, category: e.target.value})}
                    className="form-input"
                    placeholder="e.g., Salary, Investment"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="secondary-button" onClick={() => setShowIncomeModal(false)}>
                  Cancel
                </button>
                <button className="primary-button" onClick={handleSaveIncome}>
                  <FiSave /> Save Income
                </button>
              </div>
            </div>
          </div>
        )}

        {showGroupModal && (
          <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Create Group</h3>
                <button className="close-btn" onClick={() => setShowGroupModal(false)}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Suggested Groups</label>
                  <div className="suggested-groups">
                    {suggestedGroups.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="suggested-group-item"
                        onClick={() => {
                          setGroupForm({
                            name: suggestion.name,
                            description: suggestion.description,
                            color: suggestion.color
                          })
                        }}
                        style={{ borderLeftColor: suggestion.color }}
                      >
                        <div className="suggested-group-color" style={{ backgroundColor: suggestion.color }}></div>
                        <div className="suggested-group-info">
                          <span className="suggested-group-name">{suggestion.name}</span>
                          <span className="suggested-group-desc">{suggestion.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-divider">
                  <span>Or create custom group</span>
                </div>
                <div className="form-group">
                  <label>Group Name *</label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                    className="form-input"
                    placeholder="Enter group name"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({...groupForm, description: e.target.value})}
                    className="form-input"
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="color"
                    value={groupForm.color}
                    onChange={(e) => setGroupForm({...groupForm, color: e.target.value})}
                    className="form-input color-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="secondary-button" onClick={() => setShowGroupModal(false)}>
                  Cancel
                </button>
                <button className="primary-button" onClick={handleSaveGroup}>
                  <FiSave /> Create Group
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
