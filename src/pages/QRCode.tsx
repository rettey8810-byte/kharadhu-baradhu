import { QRCodeSVG } from 'qrcode.react'
import { useLanguage } from '../hooks/useLanguage'
import { Share2, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function QRCode() {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  
  // App URL - change this to your deployed URL
  const appUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://kharadhu-baradhu.netlify.app'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('app_name'),
          text: t('share_app_text'),
          url: appUrl,
        })
      } catch {
        // ignore
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">{t('qr_code_title')}</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-6">
        <p className="text-gray-600">{t('qr_code_description')}</p>
        
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-xl shadow-lg border-2 border-emerald-100">
            <QRCodeSVG 
              value={appUrl}
              size={200}
              bgColor={"#ffffff"}
              fgColor={"#059669"}
              level={"M"}
              includeMargin={false}
            />
          </div>
        </div>

        {/* URL Display */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-500 mb-1">{t('app_url')}</p>
          <p className="text-emerald-600 font-medium break-all">{appUrl}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
          >
            {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
            {copied ? t('copied') : t('copy_link')}
          </button>
          
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <Share2 size={18} />
              {t('share')}
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-emerald-800">{t('how_to_use')}</h2>
        <ol className="text-sm text-emerald-700 space-y-2 list-decimal list-inside">
          <li>{t('qr_step_1')}</li>
          <li>{t('qr_step_2')}</li>
          <li>{t('qr_step_3')}</li>
        </ol>
      </div>
    </div>
  )
}
