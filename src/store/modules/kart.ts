import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface CartState {
  quantities: Record<string, number>
  wishlist: Record<string, boolean>

  setQuantity: (id: string, quantity: number) => void
  addToCart: (id: string, quantity?: number) => void
  removeFromCart: (id: string) => void
  clearCart: () => void

  toggleWishlist: (id: string) => void
}

const CART_STORAGE_KEY = 'cart-storage'

const sanitizeQuantities = (quantities: Record<string, number> = {}) => {
  return Object.fromEntries(
    Object.entries(quantities)
      .map(([id, qty]) => [id, Math.max(1, Math.floor(Number(qty) || 1))])
      .filter(([id]) => Boolean(id))
  )
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      quantities: {},
      wishlist: {},

      setQuantity: (id, quantity) => set((state) => ({
        quantities: { ...state.quantities, [id]: Math.max(1, Math.floor(quantity || 1)) },
      })),

      addToCart: (id, quantity = 1) => set((state) => {
        const current = state.quantities[id] || 0
        const next = current + Math.max(1, Math.floor(quantity))
        return { quantities: { ...state.quantities, [id]: next } }
      }),

      removeFromCart: (id) => set((state) => {
        const next = { ...state.quantities }
        delete next[id]
        return { quantities: next }
      }),

      clearCart: () => set({ quantities: {} }),

      toggleWishlist: (id) => set((state) => ({
        wishlist: { ...state.wishlist, [id]: !state.wishlist[id] },
      })),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        quantities: state.quantities,
        wishlist: state.wishlist,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CartState> | undefined
        return {
          ...currentState,
          quantities: sanitizeQuantities(persisted?.quantities),
          wishlist: persisted?.wishlist || {},
        }
      },
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== CART_STORAGE_KEY || !event.newValue) return

    try {
      const persisted = JSON.parse(event.newValue)
      const state = persisted?.state || {}
      useCartStore.setState({
        quantities: sanitizeQuantities(state.quantities),
        wishlist: state.wishlist || {},
      })
    } catch (error) {
      // Ignore malformed external storage writes.
    }
  })
}
