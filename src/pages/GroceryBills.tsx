import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import type { GroceryBill, GroceryBillItem } from '../types'
import { Store, Calendar, Receipt, ChevronDown, ChevronUp, Search, TrendingDown, Package } from 'lucide-react'

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
  const { currentProfile } = useProfile()
  const { t } = useLanguage()
  const [bills, setBills] = useState<BillWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShop, setSelectedShop] = useState<string>('all')
  const [priceComparisons, setPriceComparisons] = useState<PriceComparison[]>([])
  const [activeTab, setActiveTab] = useState<'bills' | 'compare'>('bills')

  useEffect(() => {
    loadBills()
  }, [currentProfile])

  const loadBills = async () => {
    if (!currentProfile) return
    setLoading(true)

    // Load grocery bills with their items
    const { data: billsData } = await supabase
      .from('grocery_bills')
      .select('*, items:grocery_bill_items(*)')
      .eq('profile_id', currentProfile.id)
      .order('bill_date', { ascending: false })

    const billsWithItems = billsData || []
    setBills(billsWithItems)

    // Build price comparison data
    buildPriceComparisons(billsWithItems)
    setLoading(false)
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

    // Filter items that appear in multiple shops
    const comparisons = Array.from(itemMap.values())
      .filter(c => c.shops.length > 1)
      .sort((a, b) => (b.mostExpensivePrice - b.cheapestPrice) - (a.mostExpensivePrice - a.cheapestPrice))

    setPriceComparisons(comparisons)
  }

  const uniqueShops = Array.from(new Set(bills.map(b => b.shop_name).filter(Boolean)))

  const filteredBills = bills.filter(bill => {
    const matchesShop = selectedShop === 'all' || bill.shop_name === selectedShop
    const matchesSearch = 
      bill.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.items?.some(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesShop && matchesSearch
  })

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
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
      </div>

      {activeTab === 'bills' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl p-3 mb-4 space-y-3">
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
    </div>
  )
}
