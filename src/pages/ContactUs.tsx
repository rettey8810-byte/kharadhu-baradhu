import { Mail, Phone, MessageCircle, User, ExternalLink } from 'lucide-react'

export default function ContactUs() {
  const developer = {
    name: 'Rettey Gasim',
    email: 'retey.ay@hotmail.com',
    phone: '+9609795529',
    viber: '+9609795529',
    whatsapp: '+9609795529'
  }

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contact Us</h1>
        <p className="text-sm text-gray-500 mt-1">
          Get in touch with the developer for support or feedback
        </p>
      </div>

      {/* Developer Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <User size={32} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{developer.name}</h2>
            <p className="text-sm text-gray-500">Developer</p>
          </div>
        </div>

        {/* Contact Methods */}
        <div className="space-y-4">
          {/* Email */}
          <a
            href={`mailto:${developer.email}`}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{developer.email}</p>
            </div>
            <ExternalLink size={16} className="text-gray-400" />
          </a>

          {/* Phone */}
          <a
            href={`tel:${developer.phone}`}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Phone size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium text-gray-900">{developer.phone}</p>
            </div>
            <ExternalLink size={16} className="text-gray-400" />
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${developer.whatsapp.replace(/\+/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <MessageCircle size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">WhatsApp</p>
              <p className="font-medium text-gray-900">{developer.whatsapp}</p>
            </div>
            <ExternalLink size={16} className="text-gray-400" />
          </a>

          {/* Viber */}
          <a
            href={`viber://chat?number=${developer.viber}`}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <MessageCircle size={20} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Viber</p>
              <p className="font-medium text-gray-900">{developer.viber}</p>
            </div>
            <ExternalLink size={16} className="text-gray-400" />
          </a>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <h3 className="font-semibold text-emerald-900 mb-2">Quick Contact</h3>
        <p className="text-sm text-emerald-700 mb-4">
          Need help? Click any option above to contact the developer directly.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`mailto:${developer.email}`}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            Send Email
          </a>
          <a
            href={`https://wa.me/${developer.whatsapp.replace(/\+/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-50"
          >
            WhatsApp
          </a>
        </div>
      </div>

      {/* Version Info */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Kharadhoo Baradhoo v1.0
        </p>
      </div>
    </div>
  )
}
