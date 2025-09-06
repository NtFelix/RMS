"use client"

import { useState } from "react"
import { Share2, Copy, Check, Clock, Download, Link } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createSignedUrl } from "@/lib/storage-service"

interface ShareDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  filePath: string
}

export function ShareDocumentModal({
  isOpen,
  onClose,
  fileName,
  filePath
}: ShareDocumentModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [signedUrl, setSignedUrl] = useState<string>("")
  const [expirationTime, setExpirationTime] = useState<string>("3600") // 1 hour default
  const [allowDownload, setAllowDownload] = useState<boolean>(false)
  const [isCopied, setIsCopied] = useState(false)
  const { toast } = useToast()

  const expirationOptions = [
    { value: "300", label: "5 Minuten" },
    { value: "1800", label: "30 Minuten" },
    { value: "3600", label: "1 Stunde" },
    { value: "21600", label: "6 Stunden" },
    { value: "86400", label: "24 Stunden" },
    { value: "604800", label: "7 Tage" },
  ]

  const handleGenerateUrl = async () => {
    setIsGenerating(true)
    setSignedUrl("")
    setIsCopied(false)

    try {
      const expiresIn = parseInt(expirationTime)
      const options = allowDownload ? { download: true } : undefined

      const url = await createSignedUrl(filePath, expiresIn, options)
      setSignedUrl(url)

      toast({
        title: "Link erstellt",
        description: `Freigabe-Link für "${fileName}" wurde erfolgreich erstellt.`
      })
    } catch (error) {
      console.error('Error generating signed URL:', error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Der Freigabe-Link konnte nicht erstellt werden.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyUrl = async () => {
    if (!signedUrl) return

    try {
      await navigator.clipboard.writeText(signedUrl)
      setIsCopied(true)
      
      toast({
        description: "Link wurde in die Zwischenablage kopiert."
      })

      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Link konnte nicht kopiert werden.",
        variant: "destructive"
      })
    }
  }

  const handleClose = () => {
    setSignedUrl("")
    setIsCopied(false)
    setExpirationTime("3600")
    setAllowDownload(false)
    onClose()
  }

  const getExpirationLabel = () => {
    const option = expirationOptions.find(opt => opt.value === expirationTime)
    return option?.label || "1 Stunde"
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share2 className="h-5 w-5 mr-2" />
            Dokument teilen
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie einen sicheren Link zum Teilen von "{fileName}".
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-2 pb-0">
          {/* Expiration Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="expiration">
              <Clock className="h-4 w-4 inline mr-1" />
              Gültigkeitsdauer
            </Label>
            <Select value={expirationTime} onValueChange={setExpirationTime}>
              <SelectTrigger>
                <SelectValue placeholder="Wählen Sie die Gültigkeitsdauer" />
              </SelectTrigger>
              <SelectContent>
                {expirationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Download Option */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="allow-download"
              checked={allowDownload}
              onCheckedChange={(checked) => setAllowDownload(checked === true)}
            />
            <Label htmlFor="allow-download" className="flex items-center cursor-pointer text-sm font-medium">
              <Download className="h-4 w-4 mr-2" />
              Download ermöglichen
            </Label>
          </div>

          {/* Generate URL Button */}
          <Button 
            onClick={handleGenerateUrl} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Link wird erstellt...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Freigabe-Link erstellen
              </>
            )}
          </Button>

          {/* Generated URL Display */}
          {signedUrl && (
            <div className="space-y-3">
              <Label>
                Freigabe-Link (gültig für {getExpirationLabel()})
              </Label>
              <div className="flex space-x-2">
                <Input
                  value={signedUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyUrl}
                  className="flex-shrink-0 h-10 px-3"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Dieser Link läuft automatisch ab und sollte nur mit vertrauenswürdigen Personen geteilt werden.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}