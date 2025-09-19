// lib/dropdown-manager.ts
"use client"

type DropdownCloseFunction = () => void

class DropdownManager {
  private openDropdowns = new Set<DropdownCloseFunction>()

  register(closeFunction: DropdownCloseFunction): () => void {
    this.openDropdowns.add(closeFunction)
    
    // Return unregister function
    return () => {
      this.openDropdowns.delete(closeFunction)
    }
  }

  closeAll(): void {
    this.openDropdowns.forEach(closeFunction => {
      try {
        closeFunction()
      } catch (error) {
        console.warn('Error closing dropdown:', error)
      }
    })
    this.openDropdowns.clear()
  }

  closeAllExcept(exceptFunction: DropdownCloseFunction): void {
    this.openDropdowns.forEach(closeFunction => {
      if (closeFunction !== exceptFunction) {
        try {
          closeFunction()
        } catch (error) {
          console.warn('Error closing dropdown:', error)
        }
      }
    })
    
    // Remove all except the exception
    this.openDropdowns.clear()
    this.openDropdowns.add(exceptFunction)
  }
}

// Global singleton instance
export const dropdownManager = new DropdownManager()