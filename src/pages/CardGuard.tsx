import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { firebaseDb } from '../lib/firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  CreditCard,
  Plus,
  Search,
  Calendar,
  X,
  Edit2,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Download,
  ScanLine,
  Link as LinkIcon,
  Check,
  Share2,
} from 'lucide-react'

// Types
interface CardDocument {
  id: string
  user_id: string
  profile_id?: string
  title: string
  issuer: string
  card_type: 'id' | 'passport' | 'license' | 'insurance' | 'membership' | 'credit' | 'debit' | 'other'
  expiry_date: string
  card_number?: string
  renew_link?: string
  renewal_provider_id?: string
  front_image_url?: string
  back_image_url?: string
  pdf_url?: string
  notes?: string
  reminders: number[] // [30, 14, 7, 1] days before
  renewal_steps: RenewalStep[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface RenewalStep {
  id: string
  title: string
  description?: string
  is_required: boolean
  is_completed: boolean
}

interface RenewalProvider {
  id: string
  user_id: string
  name: string
  portal_url?: string
  instructions?: string
  created_at: string
}

// Card type options
const cardTypes = [
  { value: 'id', label: 'ID Card', icon: 'User' },
  { value: 'passport', label: 'Passport', icon: 'FileText' },
  { value: 'license', label: 'Driver License', icon: 'CreditCard' },
  { value: 'insurance', label: 'Insurance', icon: 'Shield' },
  { value: 'membership', label: 'Membership', icon: 'Users' },
  { value: 'credit', label: 'Credit Card', icon: 'CreditCard' },
  { value: 'debit', label: 'Debit Card', icon: 'CreditCard' },
  { value: 'other', label: 'Other', icon: 'FileText' },
] as const

// Cloudinary upload function
async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'cardguard')
  formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '')
  formData.append('folder', folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  const data = await response.json()
  return data.secure_url
}

  // Helper function to fetch image as File
  const fetchImageAsFile = async (imageUrl: string, filename: string): Promise<File | null> => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      return new File([blob], filename, { type: blob.type })
    } catch (error) {
      console.error('Failed to fetch image:', error)
      return null
    }
  }

  // Share image using Web Share API
  const shareImage = async (imageUrl: string, title: string, isBack: boolean = false) => {
    const filename = `${title.replace(/\s+/g, '_')}_${isBack ? 'back' : 'front'}.jpg`
    const file = await fetchImageAsFile(imageUrl, filename)

    if (!file) {
      alert('Failed to load image for sharing')
      return
    }

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${title} - ${isBack ? 'Back' : 'Front'} Image`,
        })
      } catch (error) {
        // User cancelled or share failed
        console.log('Share cancelled or failed:', error)
      }
    } else {
      // Fallback: open image in new tab for manual saving/sharing
      window.open(imageUrl, '_blank')
    }
  }

  // Share card via WhatsApp with image
  const shareViaWhatsApp = async (card: CardDocument) => {
    const imageUrl = card.front_image_url || card.back_image_url
    if (imageUrl) {
      await shareImage(imageUrl, card.title, false)
    } else {
      // Fallback to text if no image
      const text = encodeURIComponent(
        `*Card Details*\n\n` +
        `Title: ${card.title}\n` +
        `Issuer: ${card.issuer}\n` +
        `Type: ${cardTypes.find(t => t.value === card.card_type)?.label || card.card_type}\n` +
        `Expiry: ${formatDate(card.expiry_date)}\n` +
        (card.card_number ? `Number: ****${card.card_number.slice(-4)}\n` : '')
      )
      window.open(`https://wa.me/?text=${text}`, '_blank')
    }
  }

  // Share card via Viber with image
  const shareViaViber = async (card: CardDocument) => {
    const imageUrl = card.front_image_url || card.back_image_url
    if (imageUrl) {
      await shareImage(imageUrl, card.title, false)
    } else {
      // Fallback to text if no image
      const text = encodeURIComponent(
        `Card Details:\n\n` +
        `Title: ${card.title}\n` +
        `Issuer: ${card.issuer}\n` +
        `Type: ${cardTypes.find(t => t.value === card.card_type)?.label || card.card_type}\n` +
        `Expiry: ${formatDate(card.expiry_date)}\n` +
        (card.card_number ? `Number: ****${card.card_number.slice(-4)}\n` : '')
      )
      window.open(`viber://forward?text=${text}`, '_blank')
    }
  }
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Get days until expiry
function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Get expiry status color
function getExpiryStatus(days: number): { color: string; text: string } {
  if (days < 0) return { color: 'text-red-600 bg-red-50', text: 'Expired' }
  if (days <= 7) return { color: 'text-red-600 bg-red-50', text: `${days} days left` }
  if (days <= 30) return { color: 'text-amber-600 bg-amber-50', text: `${days} days left` }
  return { color: 'text-emerald-600 bg-emerald-50', text: `${days} days left` }
}

export default function CardGuard() {
  const { user } = useAuth()
  const { profiles: appProfiles } = useProfile()

  // State
  const [cards, setCards] = useState<CardDocument[]>([])
  const [providers, setProviders] = useState<RenewalProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CardDocument | null>(null)
  const [activeTab, setActiveTab] = useState<'cards' | 'providers'>('cards')

  // Form state
  const [formData, setFormData] = useState<Partial<CardDocument>>({
    title: '',
    issuer: '',
    card_type: 'id',
    expiry_date: '',
    card_number: '',
    renew_link: '',
    profile_id: '',
    renewal_provider_id: '',
    notes: '',
    reminders: [30, 14, 7, 1],
    renewal_steps: [],
  })
  const [frontImage, setFrontImage] = useState<File | null>(null)
  const [backImage, setBackImage] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Credit card balance state (for setting existing balance)
  const [initialBalance, setInitialBalance] = useState<string>('')

  // Provider form
  const [providerForm, setProviderForm] = useState({
    name: '',
    portal_url: '',
    instructions: '',
  })

  // Load data
  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load cards
      const cardsQuery = query(
        collection(firebaseDb, 'users', user!.uid, 'cards'),
        where('user_id', '==', user!.uid),
        orderBy('expiry_date', 'asc')
      )
      const cardsSnap = await getDocs(cardsQuery)
      const cardsData = cardsSnap.docs.map(d => ({
        id: d.id,
        ...d.data() as Omit<CardDocument, 'id'>,
      }))
      setCards(cardsData)

      // Load providers
      const providersQuery = query(
        collection(firebaseDb, 'users', user!.uid, 'renewalProviders'),
        where('user_id', '==', user!.uid),
        orderBy('name', 'asc')
      )
      const providersSnap = await getDocs(providersQuery)
      const providersData = providersSnap.docs.map(d => ({
        id: d.id,
        ...d.data() as Omit<RenewalProvider, 'id'>,
      }))
      setProviders(providersData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtered cards
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const matchesSearch =
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.card_number?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesProfile = selectedProfile === 'all' || card.profile_id === selectedProfile
      const matchesType = selectedType === 'all' || card.card_type === selectedType
      return matchesSearch && matchesProfile && matchesType
    })
  }, [cards, searchQuery, selectedProfile, selectedType])

  // Add card
  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setUploading(true)
    try {
      let frontUrl = ''
      let backUrl = ''
      let pdfUrl = ''

      if (frontImage) {
        frontUrl = await uploadToCloudinary(frontImage, `cardguard/${user.uid}/front`)
      }
      if (backImage) {
        backUrl = await uploadToCloudinary(backImage, `cardguard/${user.uid}/back`)
      }
      if (pdfFile) {
        pdfUrl = await uploadToCloudinary(pdfFile, `cardguard/${user.uid}/pdf`)
      }

      const newCard = {
        user_id: user.uid,
        ...formData,
        front_image_url: frontUrl || null,
        back_image_url: backUrl || null,
        pdf_url: pdfUrl || null,
        is_active: true,
        renewal_steps: formData.renewal_steps || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const docRef = await addDoc(collection(firebaseDb, 'users', user.uid, 'cards'), newCard)
      const newCardId = docRef.id

      // If credit/debit card has initial balance, create a loan record
      const balanceNum = Number(initialBalance)
      if ((formData.card_type === 'credit' || formData.card_type === 'debit') && balanceNum > 0) {
        await addDoc(collection(firebaseDb, 'users', user.uid, 'loans'), {
          profile_id: formData.profile_id || null,
          loan_type: 'borrowed',
          category: 'credit_card',
          card_id: newCardId,
          card_name: formData.title,
          lender_name: formData.issuer,
          principal_amount: balanceNum,
          currency: 'MVR',
          interest_rate: 0,
          interest_type: 'none',
          loan_date: new Date().toISOString().slice(0, 10),
          due_date: null,
          total_amount: balanceNum,
          amount_paid: 0,
          emi_amount: null,
          total_installments: null,
          installments_paid: 0,
          status: 'active',
          description: `Existing balance for ${formData.title}`,
          created_at: new Date().toISOString()
        })
      }

      setShowAddModal(false)
      resetForm()
      setInitialBalance('')
      // Reset filters to show the new card
      setSearchQuery('')
      setSelectedProfile('all')
      setSelectedType('all')
      await loadData()
      // Auto-open view modal for the new card
      const savedCard: CardDocument = {
        id: newCardId,
        user_id: user.uid,
        ...formData,
        front_image_url: frontUrl || undefined,
        back_image_url: backUrl || undefined,
        pdf_url: pdfUrl || undefined,
        is_active: true,
        renewal_steps: formData.renewal_steps || [],
        created_at: newCard.created_at,
        updated_at: newCard.updated_at,
      } as CardDocument
      setSelectedCard(savedCard)
      setShowViewModal(true)
    } catch (error) {
      console.error('Error adding card:', error)
      alert('Failed to add card. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Edit card
  const handleEditCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedCard) return

    setUploading(true)
    try {
      let frontUrl = selectedCard.front_image_url || ''
      let backUrl = selectedCard.back_image_url || ''
      let pdfUrl = selectedCard.pdf_url || ''

      if (frontImage) {
        frontUrl = await uploadToCloudinary(frontImage, `cardguard/${user.uid}/front`)
      }
      if (backImage) {
        backUrl = await uploadToCloudinary(backImage, `cardguard/${user.uid}/back`)
      }
      if (pdfFile) {
        pdfUrl = await uploadToCloudinary(pdfFile, `cardguard/${user.uid}/pdf`)
      }

      const updates = {
        ...formData,
        front_image_url: frontUrl || null,
        back_image_url: backUrl || null,
        pdf_url: pdfUrl || null,
        updated_at: new Date().toISOString(),
      }

      await updateDoc(doc(firebaseDb, 'users', user.uid, 'cards', selectedCard.id), updates)

      setShowEditModal(false)
      setSelectedCard(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error updating card:', error)
      alert('Failed to update card. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Delete card
  const handleDeleteCard = async (cardId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this card?')) return

    try {
      await deleteDoc(doc(firebaseDb, 'users', user.uid, 'cards', cardId))
      loadData()
    } catch (error) {
      console.error('Error deleting card:', error)
      alert('Failed to delete card. Please try again.')
    }
  }

  // Add provider
  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      await addDoc(collection(firebaseDb, 'users', user.uid, 'renewalProviders'), {
        user_id: user.uid,
        ...providerForm,
        created_at: new Date().toISOString(),
      })
      setProviderForm({ name: '', portal_url: '', instructions: '' })
      loadData()
    } catch (error) {
      console.error('Error adding provider:', error)
    }
  }

  // Delete provider
  const handleDeleteProvider = async (providerId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this provider?')) return

    try {
      await deleteDoc(doc(firebaseDb, 'users', user.uid, 'renewalProviders', providerId))
      loadData()
    } catch (error) {
      console.error('Error deleting provider:', error)
    }
  }

  const cardProfiles = useMemo(() => {
    return appProfiles.map((p) => ({
      id: p.id,
      name: p.name,
      color: '#6366f1',
    }))
  }, [appProfiles])

  // Toggle renewal step
  const toggleRenewalStep = async (card: CardDocument, stepId: string) => {
    if (!user) return

    const updatedSteps = card.renewal_steps.map(step =>
      step.id === stepId ? { ...step, is_completed: !step.is_completed } : step
    )

    try {
      await updateDoc(doc(firebaseDb, 'users', user.uid, 'cards', card.id), {
        renewal_steps: updatedSteps,
        updated_at: new Date().toISOString(),
      })
      loadData()
    } catch (error) {
      console.error('Error updating step:', error)
    }
  }

  // Export to calendar (.ics)
  const exportToCalendar = (card: CardDocument) => {
    const expiryDate = new Date(card.expiry_date)
    const eventDate = expiryDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const createdDate = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CardGuard//Card Expiry//EN
BEGIN:VEVENT
UID:${card.id}@cardguard
DTSTAMP:${createdDate}
DTSTART:${eventDate}
DTEND:${eventDate}
SUMMARY:${card.title} Expires
DESCRIPTION:Your ${card.issuer} ${card.title} expires today. Don't forget to renew!
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:${card.title} Expiry Reminder
TRIGGER:-P1D
END:VALARM
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${card.title.replace(/\s+/g, '_')}_expiry.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Add to Google Calendar
  const addToGoogleCalendar = (card: CardDocument) => {
    const expiryDate = new Date(card.expiry_date)
    const startDate = expiryDate.toISOString().split('T')[0].replace(/-/g, '')
    const endDate = startDate

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `${card.title} Expires`
    )}&dates=${startDate}/${endDate}&details=${encodeURIComponent(
      `Your ${card.issuer} ${card.title} expires today. Don't forget to renew!`
    )}&sf=true&output=ics`

    window.open(url, '_blank')
  }

  // Download file from URL
  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error downloading file:', error)
      // Fallback: open in new tab
      window.open(url, '_blank')
    }
  }
  const resetForm = () => {
    setFormData({
      title: '',
      issuer: '',
      card_type: 'id',
      expiry_date: '',
      card_number: '',
      renew_link: '',
      profile_id: '',
      renewal_provider_id: '',
      notes: '',
      reminders: [30, 14, 7, 1],
      renewal_steps: [],
    })
    setFrontImage(null)
    setBackImage(null)
    setPdfFile(null)
    setInitialBalance('')
  }

  // Open edit modal
  const openEditModal = (card: CardDocument) => {
    setSelectedCard(card)
    setFormData({
      title: card.title,
      issuer: card.issuer,
      card_type: card.card_type,
      expiry_date: card.expiry_date,
      card_number: card.card_number || '',
      renew_link: card.renew_link || '',
      profile_id: card.profile_id || '',
      renewal_provider_id: card.renewal_provider_id || '',
      notes: card.notes || '',
      reminders: card.reminders || [30, 14, 7, 1],
      renewal_steps: card.renewal_steps || [],
    })
    setShowEditModal(true)
  }

  // Open view modal
  const openViewModal = (card: CardDocument) => {
    setSelectedCard(card)
    setShowViewModal(true)
  }

  // Add renewal step
  const addRenewalStep = () => {
    const newStep: RenewalStep = {
      id: Date.now().toString(),
      title: '',
      description: '',
      is_required: true,
      is_completed: false,
    }
    setFormData(prev => ({
      ...prev,
      renewal_steps: [...(prev.renewal_steps || []), newStep],
    }))
  }

  // Update renewal step
  const updateRenewalStep = (stepId: string, field: keyof RenewalStep, value: any) => {
    setFormData(prev => ({
      ...prev,
      renewal_steps: prev.renewal_steps?.map(step =>
        step.id === stepId ? { ...step, [field]: value } : step
      ) || [],
    }))
  }

  // Remove renewal step
  const removeRenewalStep = (stepId: string) => {
    setFormData(prev => ({
      ...prev,
      renewal_steps: prev.renewal_steps?.filter(step => step.id !== stepId) || [],
    }))
  }

  // Toggle reminder
  const toggleReminder = (day: number) => {
    setFormData(prev => {
      const currentReminders = prev.reminders || []
      if (currentReminders.includes(day)) {
        return { ...prev, reminders: currentReminders.filter(r => r !== day) }
      }
      return { ...prev, reminders: [...currentReminders, day].sort((a, b) => b - a) }
    })
  }

  // OCR scan simulation (placeholder for actual OCR implementation)
  const handleOCRScan = async (_file: File) => {
    // This is a placeholder - actual OCR would use Tesseract.js or similar
    alert('OCR scanning would extract text from the image here. For now, please enter details manually.')
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CardGuard</h1>
            <p className="text-sm text-gray-500">Manage cards, documents & expirations</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90"
        >
          <Plus size={20} />
          Add Card
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'cards', label: 'Cards', icon: CreditCard },
          { id: 'providers', label: 'Providers', icon: ExternalLink },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards Tab */}
      {activeTab === 'cards' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedProfile}
              onChange={e => setSelectedProfile(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Profiles</option>
              {cardProfiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              {cardTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No cards found</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-indigo-600 font-medium hover:underline"
              >
                Add your first card
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map(card => {
                const daysLeft = getDaysUntilExpiry(card.expiry_date)
                const profile = cardProfiles.find(p => p.id === card.profile_id)

                return (
                  <div
                    key={card.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => openViewModal(card)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            profile?.color ? '' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          }`}
                          style={profile?.color ? { backgroundColor: profile.color + '20' } : {}}
                        >
                          <CreditCard
                            className="w-6 h-6"
                            style={profile?.color ? { color: profile.color } : { color: '#ffffff' }}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{card.title}</h3>
                          <p className="text-sm text-gray-500">{card.issuer}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            openEditModal(card)
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteCard(card.id)
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500 mb-0.5">Type</p>
                        <p className="text-sm font-medium text-gray-900">
                          {cardTypes.find(t => t.value === card.card_type)?.label}
                        </p>
                      </div>
                      {card.card_number && (
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 mb-0.5">Number</p>
                          <p className="text-sm font-medium text-gray-900">
                            ****{card.card_number.slice(-4)}
                          </p>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500 mb-0.5">Expires</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(card.expiry_date)}</p>
                      </div>
                      <div className={`rounded-lg p-2 ${
                        daysLeft <= 7 ? 'bg-red-50' : 
                        daysLeft <= 30 ? 'bg-amber-50' : 'bg-emerald-50'
                      }`}>
                        <p className={`text-xs mb-0.5 ${
                          daysLeft <= 7 ? 'text-red-600' : 
                          daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>Days Left</p>
                        <p className={`text-sm font-bold ${
                          daysLeft <= 7 ? 'text-red-700' : 
                          daysLeft <= 30 ? 'text-amber-700' : 'text-emerald-700'
                        }`}>{daysLeft} days</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        {(card.front_image_url || card.back_image_url) && (
                          <span 
                            title="Has images"
                            className="flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-full text-xs text-indigo-600"
                          >
                            <ImageIcon size={12} />
                            Images
                          </span>
                        )}
                        {card.pdf_url && (
                          <span 
                            title="Has PDF"
                            className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-full text-xs text-purple-600"
                          >
                            <FileText size={12} />
                            PDF
                          </span>
                        )}
                      </div>
                      {profile && (
                        <span
                          className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: profile.color + '20', color: profile.color }}
                        >
                          {profile.name}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Providers Tab */}
      {activeTab === 'providers' && (
        <div className="max-w-2xl">
          <form onSubmit={handleAddProvider} className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Add Renewal Provider</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Provider name (e.g., DMV, Passport Office)"
                value={providerForm.name}
                onChange={e => setProviderForm({ ...providerForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
              <input
                type="url"
                placeholder="Portal URL (optional)"
                value={providerForm.portal_url}
                onChange={e => setProviderForm({ ...providerForm, portal_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <textarea
                placeholder="Instructions (what to type/click in portal)"
                value={providerForm.instructions}
                onChange={e => setProviderForm({ ...providerForm, instructions: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
              >
                Add Provider
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {providers.map(provider => (
              <div
                key={provider.id}
                className={`bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between ${
                  provider.portal_url ? 'cursor-pointer hover:bg-gray-50' : ''
                }`}
                onClick={() => {
                  if (provider.portal_url) window.open(provider.portal_url, '_blank')
                }}
              >
                <div>
                  <h4 className="font-medium text-gray-900">{provider.name}</h4>
                  {provider.portal_url && (
                    <a
                      href={provider.portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LinkIcon size={14} />
                      Open Portal
                    </a>
                  )}
                  {provider.instructions && (
                    <p className="text-sm text-gray-500 mt-2">{provider.instructions}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteProvider(provider.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Add Card</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCard} className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., National ID"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuer</label>
                  <input
                    type="text"
                    value={formData.issuer}
                    onChange={e => setFormData({ ...formData, issuer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Government"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.card_type}
                    onChange={e => setFormData({ ...formData, card_type: e.target.value as CardDocument['card_type'] })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {cardTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Initial Balance - only for credit/debit cards */}
              {(formData.card_type === 'credit' || formData.card_type === 'debit') && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-indigo-900 mb-1">
                    Current Outstanding Balance (MVR)
                  </label>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={e => setInitialBalance(e.target.value)}
                    className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-indigo-600 mt-1">
                    Enter your existing credit card debt. This will create a loan record without adding an expense.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.card_number}
                    onChange={e => setFormData({ ...formData, card_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Last 4 digits will be shown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Renew Link (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.renew_link}
                    onChange={e => setFormData({ ...formData, renew_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile</label>
                  <select
                    value={formData.profile_id}
                    onChange={e => setFormData({ ...formData, profile_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None</option>
                    {cardProfiles.map(profile => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Renewal Provider
                  </label>
                  <select
                    value={formData.renewal_provider_id}
                    onChange={e => setFormData({ ...formData, renewal_provider_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None</option>
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reminders */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminders (days before expiry)
                </label>
                <div className="flex gap-2">
                  {[30, 14, 7, 1].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleReminder(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.reminders?.includes(day)
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day} days
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Reminders can be configured per-card for different schedules
                </p>
              </div>

              {/* Renewal Steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Renewal Steps</label>
                  <button
                    type="button"
                    onClick={addRenewalStep}
                    className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.renewal_steps?.map((step, index) => (
                    <div key={step.id} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={step.title}
                        onChange={e => updateRenewalStep(step.id, 'title', e.target.value)}
                        placeholder={`Step ${index + 1} title`}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={step.description || ''}
                        onChange={e => updateRenewalStep(step.id, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={step.is_required}
                          onChange={e => updateRenewalStep(step.id, 'is_required', e.target.checked)}
                          className="rounded"
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => removeRenewalStep(step.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uploads */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Front Image</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        setFrontImage(e.target.files?.[0] || null)
                        if (e.target.files?.[0]) {
                          handleOCRScan(e.target.files[0])
                        }
                      }}
                      className="hidden"
                      id="front-upload"
                    />
                    <label
                      htmlFor="front-upload"
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50"
                    >
                      {frontImage ? (
                        <span className="text-sm text-indigo-600">{frontImage.name}</span>
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">Upload</span>
                        </>
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    <ScanLine size={10} className="inline" /> Auto-scan supported
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Back Image</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setBackImage(e.target.files?.[0] || null)}
                      className="hidden"
                      id="back-upload"
                    />
                    <label
                      htmlFor="back-upload"
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50"
                    >
                      {backImage ? (
                        <span className="text-sm text-indigo-600">{backImage.name}</span>
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">Upload</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PDF</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={e => setPdfFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50"
                    >
                      {pdfFile ? (
                        <span className="text-sm text-indigo-600">{pdfFile.name}</span>
                      ) : (
                        <>
                          <FileText className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">Upload</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Save Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {showEditModal && selectedCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Edit Card</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedCard(null)
                  resetForm()
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditCard} className="p-6 space-y-4">
              {/* Same form fields as Add Card */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuer</label>
                  <input
                    type="text"
                    value={formData.issuer}
                    onChange={e => setFormData({ ...formData, issuer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.card_type}
                    onChange={e => setFormData({ ...formData, card_type: e.target.value as CardDocument['card_type'] })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {cardTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                  <input
                    type="text"
                    value={formData.card_number}
                    onChange={e => setFormData({ ...formData, card_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Renew Link</label>
                  <input
                    type="url"
                    value={formData.renew_link}
                    onChange={e => setFormData({ ...formData, renew_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile</label>
                  <select
                    value={formData.profile_id}
                    onChange={e => setFormData({ ...formData, profile_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None</option>
                    {cardProfiles.map(profile => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Renewal Provider
                  </label>
                  <select
                    value={formData.renewal_provider_id}
                    onChange={e => setFormData({ ...formData, renewal_provider_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None</option>
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reminders */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminders (days before expiry)
                </label>
                <div className="flex gap-2">
                  {[30, 14, 7, 1].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleReminder(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.reminders?.includes(day)
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day} days
                    </button>
                  ))}
                </div>
              </div>

              {/* Renewal Steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Renewal Steps</label>
                  <button
                    type="button"
                    onClick={addRenewalStep}
                    className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.renewal_steps?.map((step, index) => (
                    <div key={step.id} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={step.title}
                        onChange={e => updateRenewalStep(step.id, 'title', e.target.value)}
                        placeholder={`Step ${index + 1} title`}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={step.description || ''}
                        onChange={e => updateRenewalStep(step.id, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={step.is_required}
                          onChange={e => updateRenewalStep(step.id, 'is_required', e.target.checked)}
                          className="rounded"
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => removeRenewalStep(step.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Existing Files */}
              {(selectedCard.front_image_url || selectedCard.back_image_url || selectedCard.pdf_url) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Files</label>
                  <div className="flex gap-2">
                    {selectedCard.front_image_url && (
                      <a
                        href={selectedCard.front_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100"
                      >
                        Front Image
                      </a>
                    )}
                    {selectedCard.back_image_url && (
                      <a
                        href={selectedCard.back_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100"
                      >
                        Back Image
                      </a>
                    )}
                    {selectedCard.pdf_url && (
                      <a
                        href={selectedCard.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Upload New Files */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Replace Files</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Front Image</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => setFrontImage(e.target.files?.[0] || null)}
                        className="hidden"
                        id="edit-front-upload"
                      />
                      <label
                        htmlFor="edit-front-upload"
                        className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50"
                      >
                        {frontImage ? (
                          <span className="text-xs text-indigo-600 truncate px-2">{frontImage.name}</span>
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Back Image</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => setBackImage(e.target.files?.[0] || null)}
                        className="hidden"
                        id="edit-back-upload"
                      />
                      <label
                        htmlFor="edit-back-upload"
                        className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50"
                      >
                        {backImage ? (
                          <span className="text-xs text-indigo-600 truncate px-2">{backImage.name}</span>
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">PDF</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => setPdfFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="edit-pdf-upload"
                      />
                      <label
                        htmlFor="edit-pdf-upload"
                        className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50"
                      >
                        {pdfFile ? (
                          <span className="text-xs text-indigo-600 truncate px-2">{pdfFile.name}</span>
                        ) : (
                          <FileText className="w-5 h-5 text-gray-400" />
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedCard(null)
                    resetForm()
                  }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Update Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Card Modal */}
      {showViewModal && selectedCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedCard.title}</h2>
                  <p className="text-sm text-gray-500">{selectedCard.issuer}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedCard(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-sm text-gray-500">Expires on</p>
                  <p className="font-semibold text-gray-900">{formatDate(selectedCard.expiry_date)}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    getExpiryStatus(getDaysUntilExpiry(selectedCard.expiry_date)).color
                  }`}
                >
                  {getExpiryStatus(getDaysUntilExpiry(selectedCard.expiry_date)).text}
                </span>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium text-gray-900">
                    {cardTypes.find(t => t.value === selectedCard.card_type)?.label}
                  </p>
                </div>
                {selectedCard.card_number && (
                  <div>
                    <p className="text-sm text-gray-500">Number</p>
                    <p className="font-medium text-gray-900">****{selectedCard.card_number.slice(-4)}</p>
                  </div>
                )}
                {selectedCard.profile_id && (
                  <div>
                    <p className="text-sm text-gray-500">Profile</p>
                    <p className="font-medium text-gray-900">
                      {cardProfiles.find(p => p.id === selectedCard.profile_id)?.name}
                    </p>
                  </div>
                )}
                {selectedCard.renewal_provider_id && (
                  <div>
                    <p className="text-sm text-gray-500">Renewal Provider</p>
                    <p className="font-medium text-gray-900">
                      {providers.find(p => p.id === selectedCard.renewal_provider_id)?.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Documents */}
              {(selectedCard.front_image_url || selectedCard.back_image_url || selectedCard.pdf_url) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Documents</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {selectedCard.front_image_url && (
                      <div className="relative group">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                          <img
                            src={selectedCard.front_image_url}
                            alt="Front"
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(selectedCard.front_image_url, '_blank')}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                          <button
                            onClick={() => window.open(selectedCard.front_image_url, '_blank')}
                            className="p-2 bg-white rounded-full hover:bg-gray-100"
                            title="View"
                          >
                            <ExternalLink size={16} className="text-gray-700" />
                          </button>
                          <button
                            onClick={() => downloadFile(selectedCard.front_image_url!, `${selectedCard.title}_front.jpg`)}
                            className="p-2 bg-white rounded-full hover:bg-gray-100"
                            title="Download"
                          >
                            <Download size={16} className="text-gray-700" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">Front Image</p>
                      </div>
                    )}
                    {selectedCard.back_image_url && (
                      <div className="relative group">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                          <img
                            src={selectedCard.back_image_url}
                            alt="Back"
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(selectedCard.back_image_url, '_blank')}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                          <button
                            onClick={() => window.open(selectedCard.back_image_url, '_blank')}
                            className="p-2 bg-white rounded-full hover:bg-gray-100"
                            title="View"
                          >
                            <ExternalLink size={16} className="text-gray-700" />
                          </button>
                          <button
                            onClick={() => downloadFile(selectedCard.back_image_url!, `${selectedCard.title}_back.jpg`)}
                            className="p-2 bg-white rounded-full hover:bg-gray-100"
                            title="Download"
                          >
                            <Download size={16} className="text-gray-700" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">Back Image</p>
                      </div>
                    )}
                    {selectedCard.pdf_url && (
                      <div className="relative group">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-indigo-50 border border-gray-200 flex flex-col items-center justify-center p-4">
                          <FileText className="w-12 h-12 text-indigo-600 mb-2" />
                          <span className="text-sm text-indigo-600 font-medium">PDF Document</span>
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                          <button
                            onClick={() => window.open(selectedCard.pdf_url, '_blank')}
                            className="p-2 bg-white rounded-full hover:bg-gray-100"
                            title="View"
                          >
                            <ExternalLink size={16} className="text-gray-700" />
                          </button>
                          <button
                            onClick={() => downloadFile(selectedCard.pdf_url!, `${selectedCard.title}.pdf`)}
                            className="p-2 bg-white rounded-full hover:bg-gray-100"
                            title="Download"
                          >
                            <Download size={16} className="text-gray-700" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">PDF</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Renewal Steps */}
              {selectedCard.renewal_steps && selectedCard.renewal_steps.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Renewal Steps</h3>
                  <div className="space-y-2">
                    {selectedCard.renewal_steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          step.is_completed ? 'bg-emerald-50' : 'bg-gray-50'
                        }`}
                      >
                        <button
                          onClick={() => toggleRenewalStep(selectedCard, step.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            step.is_completed ? 'bg-emerald-500 text-white' : 'bg-gray-200'
                          }`}
                        >
                          {step.is_completed && <Check size={14} />}
                        </button>
                        <div className="flex-1">
                          <p className={`font-medium ${step.is_completed ? 'text-emerald-700 line-through' : 'text-gray-900'}`}>
                            {index + 1}. {step.title}
                            {step.is_required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </p>
                          {step.description && (
                            <p className="text-sm text-gray-500">{step.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCard.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-600 text-sm">{selectedCard.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                {selectedCard.renew_link && (
                  <a
                    href={selectedCard.renew_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    <ExternalLink size={18} />
                    Renew Now
                  </a>
                )}
                {selectedCard.renewal_provider_id && (
                  <button
                    onClick={() => {
                      const provider = providers.find(p => p.id === selectedCard.renewal_provider_id)
                      if (provider?.portal_url) {
                        window.open(provider.portal_url, '_blank')
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <LinkIcon size={18} />
                    Provider Portal
                  </button>
                )}
                <div className="flex-1" />
                <div className="flex gap-2 flex-wrap">
                  {selectedCard.front_image_url && (
                    <button
                      onClick={() => shareImage(selectedCard.front_image_url!, selectedCard.title, false)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      title="Share Front Image"
                    >
                      <Share2 size={18} />
                      Share Front
                    </button>
                  )}
                  {selectedCard.back_image_url && (
                    <button
                      onClick={() => shareImage(selectedCard.back_image_url!, selectedCard.title, true)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      title="Share Back Image"
                    >
                      <Share2 size={18} />
                      Share Back
                    </button>
                  )}
                  <button
                    onClick={() => exportToCalendar(selectedCard)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Download size={18} />
                    .ics
                  </button>
                  <button
                    onClick={() => addToGoogleCalendar(selectedCard)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Calendar size={18} />
                    Google
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      openEditModal(selectedCard)
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Edit2 size={18} />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
