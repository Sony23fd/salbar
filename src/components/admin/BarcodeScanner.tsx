"use client"

import { useEffect, useRef, useState } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"
import { Scan, ScanLine, X } from "lucide-react"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  disabled?: boolean
}

export function BarcodeScanner({ onScan, disabled = false }: BarcodeScannerProps) {
  const [showCamera, setShowCamera] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  // Hardware Scanner Listener (Keyboard strokes)
  useEffect(() => {
    if (disabled || showCamera) return;

    let barcode = ""
    let timeout: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field (unless it's specifically allowed)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Enter" && barcode.length > 2) {
        onScan(barcode)
        barcode = ""
        e.preventDefault()
        return
      }

      if (e.key !== "Shift" && e.key !== "Control" && e.key !== "Alt") {
        barcode += e.key
      }

      clearTimeout(timeout)
      timeout = setTimeout(() => {
        barcode = "" // Clear if typing is too slow (not a scanner)
      }, 50) // Hardware scanners type very fast
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      clearTimeout(timeout)
    }
  }, [onScan, disabled, showCamera])

  // Camera Scanner Setup
  useEffect(() => {
    if (showCamera && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false
      )

      scannerRef.current.render(
        (decodedText) => {
          onScan(decodedText)
          handleCloseCamera()
        },
        (error) => {
          // Ignore frequent error callbacks for not finding a barcode
        }
      )
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
        scannerRef.current = null
      }
    }
  }, [showCamera, onScan])

  const handleCloseCamera = () => {
    setShowCamera(false)
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
      scannerRef.current = null
    }
  }

  return (
    <div>
      {!showCamera ? (
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={disabled}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-slate-200"
        >
          <ScanLine className="w-4 h-4 text-[#F26522]" /> Камераар уншуулах
        </button>
      ) : (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md relative">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold flex items-center gap-2">
                <Scan className="w-5 h-5 text-[#F26522]" /> Баркод уншуулах
              </h3>
              <button 
                onClick={handleCloseCamera}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div id="reader" className="w-full"></div>
            </div>
            <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 border-t">
              Барааны баркодыг камерт ойртуулна уу
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
