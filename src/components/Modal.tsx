import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}

export default function Modal({ open, title, children, onClose, footer }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg rounded-lg bg-white  shadow-lg border border-gray-200 ">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 ">
          <h2 className="text-lg font-semibold text-gray-900 ">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900  "
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200  flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

