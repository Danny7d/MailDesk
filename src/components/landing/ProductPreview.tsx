export default function ProductPreview() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden">
        {/* Browser window header */}
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white rounded-md px-4 py-1 text-xs text-gray-500 font-medium">
              MailDesk
            </div>
          </div>
        </div>

        {/* Product UI */}
        <div className="p-6 bg-gray-50">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-900">Compose Email</h3>
              <p className="text-sm text-gray-600">Send a new email through your connected Resend account</p>
            </div>

            {/* From field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="info"
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm"
                />
                <span className="flex items-center text-gray-500">@</span>
                <select
                  disabled
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm"
                >
                  <option>example.com</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">Email will be sent from: info@example.com</p>
            </div>

            {/* To field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <input
                type="email"
                value="customer@example.com"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm"
              />
            </div>

            {/* Subject field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value="Welcome to MailDesk"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm"
              />
            </div>

            {/* Message field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value="Thank you for signing up for MailDesk. We're excited to help you send emails without writing code..."
                readOnly
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm resize-none"
              />
            </div>

            {/* Send button */}
            <div className="flex justify-end pt-2">
              <button
                disabled
                className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium opacity-70"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
