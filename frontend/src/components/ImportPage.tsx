import { useState, useEffect } from 'react'
import axios from 'axios'
import './ImportPage.css'
import {
  FiDownload,
  FiRefreshCw,
  FiFilter,
  FiPlus,
  FiCalendar,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiTag,
  FiDollarSign,
  FiTrendingDown
} from 'react-icons/fi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

interface ImportedExpense {
  id: string
  description: string
  amount: number
  currency: string
  date: string
  category?: string
  expense_type?: string
  net_balance?: number
  total_expense?: number
  owed_share?: number
  splitwise_id?: string
}

interface ImportPageProps {
  onBack?: () => void
  onExpenseAdded?: () => void
}

interface Group {
  id: string
  name: string
  description?: string
  color?: string
}

const ImportPage = ({ onBack, onExpenseAdded }: ImportPageProps) => {
  const [importedExpenses, setImportedExpenses] = useState<ImportedExpense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<ImportedExpense[]>([])
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showImportForm, setShowImportForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [importMode, setImportMode] = useState<'dateRange' | 'monthYear'>('dateRange')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  
  // Filter states
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Edit/Confirm modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [expensesToConfirm, setExpensesToConfirm] = useState<ImportedExpense[]>([])
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(0)
  const [groups, setGroups] = useState<Group[]>([])
  const [editingExpense, setEditingExpense] = useState<ImportedExpense | null>(null)

  useEffect(() => {
    applyFilters()
  }, [importedExpenses, filterCategory, filterType, filterDateFrom, filterDateTo, searchQuery])

  useEffect(() => {
    fetchGroups()
  }, [])

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

  const applyFilters = () => {
    let filtered = [...importedExpenses]

    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterCategory) {
      filtered = filtered.filter(e => e.category === filterCategory)
    }

    if (filterType) {
      filtered = filtered.filter(e => e.expense_type === filterType)
    }

    if (filterDateFrom) {
      filtered = filtered.filter(e => new Date(e.date) >= new Date(filterDateFrom))
    }

    if (filterDateTo) {
      filtered = filtered.filter(e => new Date(e.date) <= new Date(filterDateTo))
    }

    setFilteredExpenses(filtered)
  }

  const handleImportExpenses = async () => {
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const payload: any = {}
      if (startDate) payload.start_date = startDate
      if (endDate) payload.end_date = endDate
      
      const token = localStorage.getItem('token')
      const response = await axios.post(`${API_URL}/splitwise/import`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.data.expenses) {
        // Only show expenses that haven't been imported yet
        const newExpenses = response.data.expenses.filter((e: any) => !e.already_imported)
        setImportedExpenses(newExpenses)
        setMessage(response.data.message || `Found ${newExpenses.length} new expenses to import. ${response.data.expenses.length - newExpenses.length} already imported.`)
      } else {
        setMessage(response.data.message || 'No expenses found.')
        setImportedExpenses([])
      }
      
      setShowImportForm(false)
      setStartDate('')
      setEndDate('')
      setSelectedMonth('')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import expenses')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToExpenses = async () => {
    if (selectedExpenses.size === 0) {
      setError('Please select at least one expense to add')
      return
    }

    const expensesToAdd = filteredExpenses.filter(e => selectedExpenses.has(e.id))
    setExpensesToConfirm(expensesToAdd)
    setEditingExpense(expensesToAdd[0])
    setEditingExpenseIndex(0)
    setShowEditModal(true)
  }

  const handleSaveExpense = async () => {
    if (!editingExpense) return

    try {
      const token = localStorage.getItem('token')
      const expenseData = {
        description: editingExpense.description,
        amount: editingExpense.owed_share || editingExpense.amount || 0,
        currency: editingExpense.currency,
        date: editingExpense.date,
        category: editingExpense.category || '',
        group_id: (editingExpense as any).group_id || '',
        group_name: groups.find(g => g.id === (editingExpense as any).group_id)?.name || '',
        expense_type: editingExpense.expense_type || 'borrowed',
        owed_share: editingExpense.owed_share || editingExpense.amount || 0,
        paid_share: (editingExpense as any).paid_share || 0,
        splitwise_id: editingExpense.splitwise_id || editingExpense.id
      }

      await axios.post(`${API_URL}/expenses`, expenseData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Move to next expense or close modal
      const nextIndex = editingExpenseIndex + 1
      if (nextIndex < expensesToConfirm.length) {
        setEditingExpenseIndex(nextIndex)
        setEditingExpense(expensesToConfirm[nextIndex])
      } else {
        // All expenses saved, close modal and refresh
        setShowEditModal(false)
        setMessage(`Successfully added ${expensesToConfirm.length} expense(s) to your expenses!`)
        setImportedExpenses(importedExpenses.filter(e => !selectedExpenses.has(e.id)))
        setSelectedExpenses(new Set())
        setExpensesToConfirm([])
        setEditingExpense(null)
        setEditingExpenseIndex(0)
        if (onExpenseAdded) {
          onExpenseAdded()
        }
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save expense')
    }
  }

  const handleSkipExpense = () => {
    const nextIndex = editingExpenseIndex + 1
    if (nextIndex < expensesToConfirm.length) {
      setEditingExpenseIndex(nextIndex)
      setEditingExpense(expensesToConfirm[nextIndex])
    } else {
      // All expenses processed
      setShowEditModal(false)
      setImportedExpenses(importedExpenses.filter(e => !selectedExpenses.has(e.id)))
      setSelectedExpenses(new Set())
      setExpensesToConfirm([])
      setEditingExpense(null)
      setEditingExpenseIndex(0)
    }
  }

  const toggleExpenseSelection = (id: string) => {
    const newSelected = new Set(selectedExpenses)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedExpenses(newSelected)
  }

  const selectAll = () => {
    if (selectedExpenses.size === filteredExpenses.length) {
      setSelectedExpenses(new Set())
    } else {
      setSelectedExpenses(new Set(filteredExpenses.map(e => e.id)))
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

  const categories = Array.from(new Set(importedExpenses.map(e => e.category).filter(Boolean)))
  const expenseTypes = Array.from(new Set(importedExpenses.map(e => e.expense_type).filter(Boolean)))

  return (
    <div className="import-page">
      <div className="import-header">
        <div>
          <h2>Import Expenses</h2>
          <p>Import expenses from Splitwise and add them to your account</p>
        </div>
        <div className="header-actions">
          {importedExpenses.length > 0 && (
            <>
              <button className="secondary-button" onClick={() => setShowFilters(!showFilters)}>
                <FiFilter /> {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button 
                className="primary-button" 
                onClick={handleAddToExpenses}
                disabled={selectedExpenses.size === 0 || importing}
              >
                {importing ? (
                  <>
                    <FiRefreshCw className="spinning" /> Adding...
                  </>
                ) : (
                  <>
                    <FiPlus /> Add Selected ({selectedExpenses.size})
                  </>
                )}
              </button>
            </>
          )}
          <button 
            className="primary-button" 
            onClick={() => setShowImportForm(!showImportForm)}
          >
            <FiDownload /> {showImportForm ? 'Cancel' : 'Import from Splitwise'}
          </button>
        </div>
      </div>

      {showImportForm && (
        <div className="import-form-section">
          <h3>Import Expenses from Splitwise</h3>
          <p className="form-help-text">Choose how you want to import expenses.</p>
          
          <div className="import-mode-selector">
            <button
              type="button"
              onClick={() => setImportMode('dateRange')}
              className={`mode-button ${importMode === 'dateRange' ? 'active' : ''}`}
            >
              <FiCalendar /> Date Range
            </button>
            <button
              type="button"
              onClick={() => setImportMode('monthYear')}
              className={`mode-button ${importMode === 'monthYear' ? 'active' : ''}`}
            >
              <FiCalendar /> Month & Year
            </button>
          </div>

          {importMode === 'dateRange' ? (
            <>
              <p className="form-help-text">Leave dates empty to import all expenses, or select a date range.</p>
              <div className="date-range-inputs">
                <div className="form-group">
                  <label htmlFor="startDate">
                    <FiCalendar className="label-icon" />
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">
                    <FiCalendar className="label-icon" />
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="form-help-text">Select a month and year to import expenses from that month.</p>
              <div className="month-year-inputs">
                <div className="form-group">
                  <label htmlFor="month">
                    <FiCalendar className="label-icon" />
                    Month
                  </label>
                  <select
                    id="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select Month</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="year">
                    <FiCalendar className="label-icon" />
                    Year
                  </label>
                  <input
                    type="number"
                    id="year"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    className="form-input"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-actions">
            <button
              onClick={handleImportExpenses}
              disabled={loading || (importMode === 'monthYear' && (!selectedMonth || !selectedYear))}
              className="primary-button"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="spinning" /> Importing...
                </>
              ) : (
                <>
                  <FiDownload /> Import Expenses
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showFilters && importedExpenses.length > 0 && (
        <div className="filters-section">
          <h3>Filter Expenses</h3>
          <div className="filters-grid">
            <div className="form-group">
              <label>Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                placeholder="Search by description..."
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="form-input"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="form-input"
              >
                <option value="">All Types</option>
                {expenseTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Date To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <button 
                className="secondary-button"
                onClick={() => {
                  setSearchQuery('')
                  setFilterCategory('')
                  setFilterType('')
                  setFilterDateFrom('')
                  setFilterDateTo('')
                }}
              >
                <FiX /> Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

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

      {importedExpenses.length === 0 ? (
        <div className="empty-state">
          <FiDownload className="empty-icon" />
          <p>No imported expenses. Import expenses from Splitwise to get started!</p>
        </div>
      ) : (
        <div className="imported-expenses-section">
          <div className="expenses-header">
            <h3>
              Imported Expenses ({filteredExpenses.length})
              {selectedExpenses.size > 0 && (
                <span className="selected-count"> - {selectedExpenses.size} selected</span>
              )}
            </h3>
            <button className="secondary-button" onClick={selectAll}>
              {selectedExpenses.size === filteredExpenses.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="imported-expenses-list">
            {filteredExpenses.map((expense) => {
              const isSelected = selectedExpenses.has(expense.id)
              const isBorrowed = expense.expense_type === "borrowed"
              const isLent = expense.expense_type === "lent"
              
              return (
                <div 
                  key={expense.id} 
                  className={`imported-expense-card ${isSelected ? 'selected' : ''} ${isBorrowed ? 'expense-borrowed' : isLent ? 'expense-lent' : ''}`}
                  onClick={() => toggleExpenseSelection(expense.id)}
                >
                  <div className="expense-checkbox">
                    {isSelected ? (
                      <FiCheckCircle className="checkbox-icon checked" />
                    ) : (
                      <div className="checkbox-icon unchecked" />
                    )}
                  </div>
                  <div className="expense-content-wrapper">
                    <div className="expense-card-header">
                      <div className="expense-icon-wrapper">
                        <FiTrendingDown className="expense-icon borrowed-icon" />
                      </div>
                      <div className="expense-content">
                        <h3 className="expense-title">{expense.description}</h3>
                        <span className="expense-badge">
                          {isBorrowed ? 'Others Paid' : isLent ? 'You Paid' : 'Your Share'}
                        </span>
                      </div>
                      <div className="expense-amount-wrapper">
                        {expense.owed_share !== undefined && expense.owed_share > 0 && (
                          <span className="expense-amount amount-lent">
                            -{formatCurrency(expense.owed_share, expense.currency)}
                          </span>
                        )}
                      </div>
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
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit/Confirm Modal */}
      {showEditModal && editingExpense && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Expense ({editingExpenseIndex + 1} of {expensesToConfirm.length})</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <FiX />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingExpense.owed_share || editingExpense.amount || 0}
                    onChange={(e) => setEditingExpense({ 
                      ...editingExpense, 
                      owed_share: parseFloat(e.target.value) || 0 
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Currency</label>
                  <input
                    type="text"
                    value={editingExpense.currency}
                    onChange={(e) => setEditingExpense({ ...editingExpense, currency: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editingExpense.date.split('T')[0]}
                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={editingExpense.category || ''}
                    onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Group</label>
                <select
                  value={(editingExpense as any).group_id || ''}
                  onChange={(e) => setEditingExpense({ 
                    ...editingExpense, 
                    group_id: e.target.value 
                  } as any)}
                >
                  <option value="">No Group</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

            </div>

            <div className="modal-footer">
              <button className="secondary-button" onClick={handleSkipExpense}>
                Skip
              </button>
              <button className="primary-button" onClick={handleSaveExpense}>
                {editingExpenseIndex < expensesToConfirm.length - 1 ? 'Save & Next' : 'Save & Finish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportPage
