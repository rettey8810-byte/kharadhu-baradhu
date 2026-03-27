import { useEffect, useState } from 'react'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, writeBatch } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import type { GroceryBill, GroceryBillItem } from '../types'
import { Store, Calendar, Receipt, ChevronDown, ChevronUp, Search, TrendingDown, Package, ArrowRight, Trash2 } from 'lucide-react'

interface BillWithItems extends GroceryBill {
  items: GroceryBillItem[]
}

interface PriceComparison {
  itemName: string
  shops: Array<{
    shopName: string
    unitPrice: number
    billDate: string
  }>
  cheapestPrice: number
  mostExpensivePrice: number
}

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function GroceryBills() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [bills, setBills] = useState<BillWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShop, setSelectedShop] = useState<string>('all')
  const [priceComparisons, setPriceComparisons] = useState<PriceComparison[]>([])
  const [activeTab, setActiveTab] = useState<'bills' | 'compare' | 'search' | 'manage'>('bills')
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all')
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [targetBillId, setTargetBillId] = useState<string>('')
  const [isMoving, setIsMoving] = useState(false)
  const [searchItemResults, setSearchItemResults] = useState<Array<{item: GroceryBillItem, bill: BillWithItems}>>([])

  useEffect(() => {
    if (user) {
      loadBills()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        loadBills()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  const loadBills = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    
    try {
      console.log('Loading all grocery bills for user:', user.uid)
      
      const billsQuery = query(
        collection(firebaseDb, 'users', user.uid, 'groceryBills'),
        orderBy('bill_date', 'desc')
      )
      const billsSnap = await getDocs(billsQuery)
      console.log('Found', billsSnap.docs.length, 'grocery bills')

      const billsWithItems: BillWithItems[] = []
      for (const billDoc of billsSnap.docs) {
        const bill = { id: billDoc.id, ...billDoc.data() } as GroceryBill
        
        const itemsQuery = query(
          collection(firebaseDb, 'users', user.uid, 'groceryBillItems'),
          where('grocery_bill_id', '==', billDoc.id)
        )
        const itemsSnap = await getDocs(itemsQuery)
        const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as GroceryBillItem)
        
        billsWithItems.push({ ...bill, items })
      }
      
      setBills(billsWithItems)
      buildPriceComparisons(billsWithItems)
    } catch (err: any) {
      console.error('Error loading grocery bills:', err)
      setError(err?.message || 'Failed to load grocery bills')
      setBills([])
    } finally {
      setLoading(false)
    }
  }

  const buildPriceComparisons = (billsData: BillWithItems[]) => {
    const itemMap = new Map<string, PriceComparison>()

    billsData.forEach(bill => {
      bill.items?.forEach(item => {
        if (!item.item_name || !item.unit_price) return

        const key = item.item_name.toLowerCase().trim()
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            itemName: item.item_name,
            shops: [],
            cheapestPrice: Infinity,
            mostExpensivePrice: 0
          })
        }

        const comparison = itemMap.get(key)!
        comparison.shops.push({
          shopName: bill.shop_name || 'Unknown',
          unitPrice: item.unit_price,
          billDate: bill.bill_date || ''
        })

        if (item.unit_price < comparison.cheapestPrice) {
          comparison.cheapestPrice = item.unit_price
        }
        if (item.unit_price > comparison.mostExpensivePrice) {
          comparison.mostExpensivePrice = item.unit_price
        }
      })
    })

    const comparisons = Array.from(itemMap.values())
      .filter(c => c.shops.length > 1)
      .sort((a, b) => (b.mostExpensivePrice - b.cheapestPrice) - (a.mostExpensivePrice - a.cheapestPrice))

    setPriceComparisons(comparisons)
  }

  const uniqueShops = Array.from(new Set(bills.map(b => b.shop_name).filter(Boolean)))

  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.bill_date || '')
    const matchesMonth = selectedMonth === 'all' || billDate.getMonth() === selectedMonth
    const matchesYear = selectedYear === 'all' || billDate.getFullYear() === selectedYear
    const matchesShop = selectedShop === 'all' || bill.shop_name === selectedShop
    const matchesSearch = 
      bill.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.items?.some(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesMonth && matchesYear && matchesShop && matchesSearch
  })

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchItemResults([])
      return
    }
    
    const query = searchQuery.toLowerCase()
    const results: Array<{item: GroceryBillItem, bill: BillWithItems}> = []
    
    bills.forEach(bill => {
      bill.items?.forEach(item => {
        if (item.item_name?.toLowerCase().includes(query)) {
          results.push({ item, bill })
        }
      })
    })
    
    results.sort((a, b) => {
      const nameCompare = a.item.item_name.localeCompare(b.item.item_name)
      if (nameCompare !== 0) return nameCompare
      return new Date(b.bill.bill_date || '').getTime() - new Date(a.bill.bill_date || '').getTime()
    })
    
    setSearchItemResults(results)
  }, [searchQuery, bills])

  const moveItems = async () => {
    if (!user || !selectedBillId || !targetBillId || selectedItemIds.size === 0) return
    
    setIsMoving(true)
    try {
      const batch = writeBatch(firebaseDb)
      
      for (const itemId of selectedItemIds) {
        const itemRef = doc(firebaseDb, 'users', user.uid, 'groceryBillItems', itemId)
        batch.update(itemRef, { grocery_bill_id: targetBillId })
      }
      
      await batch.commit()
      
      const sourceBill = bills.find(b => b.id === selectedBillId)
      const remainingItems = sourceBill?.items?.filter(i => !selectedItemIds.has(i.id)) || []
      
      if (remainingItems.length === 0) {
        await deleteDoc(doc(firebaseDb, 'users', user.uid, 'groceryBills', selectedBillId))
        console.log('Deleted empty bill:', selectedBillId)
      }
      
      setSelectedItemIds(new Set())
      setSelectedBillId(null)
      setTargetBillId('')
      
      await loadBills()
      
      alert(`Moved ${selectedItemIds.size} items. ${remainingItems.length === 0 ? 'Empty bill deleted.' : ''}`)
    } catch (err) {
      console.error('Error moving items:', err)
      alert('Failed to move items')
    } finally {
      setIsMoving(false)
    }
  }

  const deleteBill = async (billId: string) => {
    if (!user) return
    
    try {
      const batch = writeBatch(firebaseDb)
      
      const bill = bills.find(b => b.id === billId)
      if (bill?.items) {
        for (const item of bill.items) {
          const itemRef = doc(firebaseDb, 'users', user.uid, 'groceryBillItems', item.id)
          batch.delete(itemRef)
        }
      }
      
      const billRef = doc(firebaseDb, 'users', user.uid, 'groceryBills', billId)
      batch.delete(billRef)
      
      await batch.commit()
      
      await loadBills()
      
      alert('Bill deleted successfully')
    } catch (err) {
      console.error('Error deleting bill:', err)
      alert('Failed to delete bill')
    }
  }

  const toggleItemSelection = (itemId: string) => {
    const newSet = new Set(selectedItemIds)
    if (newSet.has(itemId)) {
      newSet.delete(itemId)
    } else {
      newSet.add(itemId)
    }
    setSelectedItemIds(newSet)
  }

  const selectAllItems = (bill: BillWithItems) => {
    if (selectedBillId === bill.id) {
      setSelectedItemIds(new Set())
      setSelectedBillId(null)
    } else {
      const allItemIds = new Set(bill.items?.map(i => i.id) || [])
      setSelectedItemIds(allItemIds)
      setSelectedBillId(bill.id)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-700 font-medium">Error loading grocery bills</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={loadBills}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">{t('grocery_bills_title') || 'Grocery Bills'}</h1>
        <p className="text-sm text-gray-500">{t('grocery_bills_subtitle') || 'Track your purchases and find the cheapest shops'}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex-1 py-2 text-sm rounded-lg ${activeTab === 'bills' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <Receipt size={16} className="inline mr-1" />
          {t('tab_bills') || 'Bills'}
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex-1 py-2 text-sm rounded-lg ${activeTab === 'compare' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <TrendingDown size={16} className="inline mr-1" />
          {t('tab_compare') || 'Price Compare'}
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 text-sm rounded-lg ${activeTab === 'search' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <Search size={16} className="inline mr-1" />
          Search
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 py-2 text-sm rounded-lg ${activeTab === 'manage' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <ArrowRight size={16} className="inline mr-1" />
          Manage
        </button>
      </div>

      {activeTab === 'bills' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl p-3 mb-4 space-y-3">
            {/* Month/Year Selectors */}
            <div className="flex gap-2">
              <select
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">All Months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">All Years</option>
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i} value={new Date().getFullYear() - 5 + i}>
                    {new Date().getFullYear() - 5 + i}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={t('placeholder_search_bills') || 'Search bills or items...'}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
              value={selectedShop}
              onChange={e => setSelectedShop(e.target.value)}
            >
              <option value="all">{t('filter_all_shops') || 'All Shops'}</option>
              {uniqueShops.map(shop => (
                <option key={shop} value={shop || ''}>{shop || 'Unknown'}</option>
              ))}
            </select>
          </div>

          {/* Bills List */}
          <div className="space-y-3">
            {filteredBills.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Receipt size={48} className="mx-auto mb-3 opacity-50" />
                <p>{t('no_grocery_bills') || 'No grocery bills found'}</p>
                <p className="text-sm mt-1">{t('add_grocery_bills_hint') || 'Add grocery transactions with receipts to see them here'}</p>
              </div>
            ) : (
              filteredBills.map(bill => {
                const isExpanded = expandedBillId === bill.id
                const itemCount = bill.items?.length || 0

                return (
                  <div key={bill.id} className="bg-white rounded-xl overflow-hidden">
                    {/* Bill Header */}
                    <button
                      onClick={() => setExpandedBillId(isExpanded ? null : bill.id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Store size={20} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{bill.shop_name || 'Unknown Shop'}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar size={12} />
                              <span>{bill.bill_date || 'No date'}</span>
                              <span>•</span>
                              <Package size={12} />
                              <span>{itemCount} items</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatMVR(bill.total || 0)}</p>
                          {isExpanded ? <ChevronUp size={20} className="text-gray-400 ml-auto" /> : <ChevronDown size={20} className="text-gray-400 ml-auto" />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Items */}
                    {isExpanded && bill.items && bill.items.length > 0 && (
                      <div className="border-t border-gray-100">
                        <div className="p-4 bg-gray-50">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-500 text-xs">
                                <th className="text-left pb-2">{t('th_item') || 'Item'}</th>
                                <th className="text-center pb-2">{t('th_qty') || 'Qty'}</th>
                                <th className="text-right pb-2">{t('th_price') || 'Price'}</th>
                                <th className="text-right pb-2">{t('th_total') || 'Total'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {bill.items.map(item => (
                                <tr key={item.id}>
                                  <td className="py-2 text-gray-900">{item.item_name}</td>
                                  <td className="py-2 text-center text-gray-600">{item.qty}</td>
                                  <td className="py-2 text-right text-gray-600">{formatMVR(item.unit_price || 0)}</td>
                                  <td className="py-2 text-right font-medium">{formatMVR(item.line_total || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="border-t-2 border-gray-200">
                              <tr>
                                <td colSpan={3} className="pt-2 text-right text-gray-600">{t('label_subtotal') || 'Subtotal'}:</td>
                                <td className="pt-2 text-right font-medium">{formatMVR(bill.subtotal || 0)}</td>
                              </tr>
                              {bill.gst_amount && bill.gst_amount > 0 && (
                                <tr>
                                  <td colSpan={3} className="text-right text-gray-600">{t('label_gst') || 'GST'}:</td>
                                  <td className="text-right">{formatMVR(bill.gst_amount)}</td>
                                </tr>
                              )}
                              <tr>
                                <td colSpan={3} className="pt-1 text-right font-semibold text-gray-900">{t('label_total') || 'Total'}:</td>
                                <td className="pt-1 text-right font-bold text-emerald-600">{formatMVR(bill.total || 0)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'compare' && (
        <>
          {/* Price Comparison */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown size={20} className="text-emerald-600" />
              <p className="text-sm text-emerald-800">
                {t('price_compare_info') || 'Compare prices across shops to find the best deals'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {priceComparisons.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <TrendingDown size={48} className="mx-auto mb-3 opacity-50" />
                <p>{t('no_price_comparisons') || 'Need more data to compare'}</p>
                <p className="text-sm mt-1">{t('price_compare_hint') || 'Buy the same item from different shops to see price comparisons'}</p>
              </div>
            ) : (
              priceComparisons.map(comparison => {
                const savings = comparison.mostExpensivePrice - comparison.cheapestPrice
                const savingsPercent = (savings / comparison.mostExpensivePrice) * 100

                return (
                  <div key={comparison.itemName} className="bg-white rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">{comparison.itemName}</h3>
                    
                    <div className="space-y-2">
                      {comparison.shops
                        .sort((a, b) => a.unitPrice - b.unitPrice)
                        .map((shop, idx) => (
                        <div key={`${shop.shopName}-${shop.billDate}`} className={`flex items-center justify-between p-2 rounded-lg ${idx === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                            {idx === 0 && <TrendingDown size={16} className="text-emerald-600" />}
                            <span className="text-sm text-gray-700">{shop.shopName}</span>
                            <span className="text-xs text-gray-400">({new Date(shop.billDate).toLocaleDateString()})</span>
                          </div>
                          <span className={`font-semibold ${idx === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                            {formatMVR(shop.unitPrice)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {savings > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-emerald-600 font-medium">
                          {t('save_upto') || 'Save up to'} {formatMVR(savings)} ({savingsPercent.toFixed(0)}%) 
                          {t('by_buying_at') || 'by buying at'} {comparison.shops.find(s => s.unitPrice === comparison.cheapestPrice)?.shopName}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'search' && (
        <>
          {/* Search Input */}
          <div className="bg-white rounded-xl p-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search for items..."
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-3">
            {searchItemResults.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Search size={48} className="mx-auto mb-3 opacity-50" />
                <p>{searchQuery ? 'No items found' : 'Enter a search term to find items'}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-2">
                  Found {searchItemResults.length} item{searchItemResults.length !== 1 ? 's' : ''}
                </p>
                {searchItemResults.map(({ item, bill }, idx) => (
                  <div key={`${item.id}-${idx}`} className="bg-white rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{item.item_name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Store size={14} />
                          <span>{bill.shop_name || 'Unknown Shop'}</span>
                          <span>•</span>
                          <Calendar size={14} />
                          <span>{bill.bill_date || 'No date'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatMVR(item.unit_price || 0)}</p>
                        {item.qty && <p className="text-xs text-gray-500">Qty: {item.qty}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'manage' && (
        <>
          {/* Manage Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Move Items:</strong> Select items from one bill and move them to another. 
              If a bill becomes empty, it will be auto-deleted.
            </p>
          </div>

          {/* Bills to Manage */}
          <div className="space-y-3">
            {bills.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Receipt size={48} className="mx-auto mb-3 opacity-50" />
                <p>No bills to manage</p>
              </div>
            ) : (
              bills.map(bill => {
                const isSelected = selectedBillId === bill.id
                const hasItems = (bill.items?.length || 0) > 0

                return (
                  <div key={bill.id} className={`bg-white rounded-xl overflow-hidden border-2 ${isSelected ? 'border-amber-400' : 'border-transparent'}`}>
                    {/* Bill Header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Store size={20} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{bill.shop_name || 'Unknown Shop'}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar size={12} />
                              <span>{bill.bill_date || 'No date'}</span>
                              <span>•</span>
                              <Package size={12} />
                              <span>{bill.items?.length || 0} items</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{formatMVR(bill.total || 0)}</p>
                          {hasItems && (
                            <button
                              onClick={() => selectAllItems(bill)}
                              className={`px-3 py-1 text-sm rounded-lg ${isSelected ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                            >
                              {isSelected ? 'Deselect' : 'Select All'}
                            </button>
                          )}
                          {!hasItems && (
                            <button
                              onClick={() => deleteBill(bill.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete empty bill"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items with Checkboxes */}
                      {hasItems && (
                        <div className="space-y-2">
                          {bill.items?.map(item => (
                            <label key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                              <input
                                type="checkbox"
                                checked={selectedItemIds.has(item.id)}
                                onChange={() => toggleItemSelection(item.id)}
                                disabled={selectedBillId !== null && selectedBillId !== bill.id}
                                className="w-4 h-4 text-amber-600 rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                                <p className="text-xs text-gray-500">
                                  {item.qty} x {formatMVR(item.unit_price || 0)}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-gray-700">{formatMVR(item.line_total || 0)}</p>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Move Controls for Selected Bill */}
                      {isSelected && selectedItemIds.size > 0 && (
                        <div className="mt-4 p-3 bg-amber-50 rounded-lg space-y-3">
                          <p className="text-sm font-medium text-amber-900">
                            {selectedItemIds.size} item(s) selected
                          </p>
                          <select
                            value={targetBillId}
                            onChange={e => setTargetBillId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="">Select target bill...</option>
                            {bills.filter(b => b.id !== bill.id).map(b => (
                              <option key={b.id} value={b.id}>
                                {b.shop_name} ({b.bill_date}) - {b.items?.length || 0} items
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={moveItems}
                              disabled={!targetBillId || isMoving}
                              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              {isMoving ? 'Moving...' : 'Move Items'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItemIds(new Set())
                                setSelectedBillId(null)
                                setTargetBillId('')
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
