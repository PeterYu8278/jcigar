import { create } from 'zustand'

interface CartState {
  quantities: Record<string, number>
  wishlist: Record<string, boolean>

  setQuantity: (id: string, quantity: number) => void
  addToCart: (id: string, quantity?: number) => void
  removeFromCart: (id: string) => void
  clearCart: () => void

  toggleWishlist: (id: string) => void
}

export const useCartStore = create<CartState>((set, get) => ({
  quantities: {},
  wishlist: {},

  setQuantity: (id, quantity) => set((state) => ({
    quantities: { ...state.quantities, [id]: Math.max(1, Math.floor(quantity || 0)) },
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
}))


