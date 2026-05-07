// Recovery Management State Store (Zustand)
// Production-grade state management for Recovery Management module

import { create } from 'zustand';

export const useRecoveryStore = create((set, get) => ({
  // Recovery Case State
  currentRecoveryId: null,
  token: null,
  expiryInfo: null,
  orderId: null,
  customerId: null,

  // Options State
  options: [],

  // Promo State
  promoCode: null,
  promoUsageLimit: null,

  // UI State
  isLoading: false,
  error: null,
  successMessage: null,

  // Actions: Recovery Case
  setCurrentRecovery: (recoveryId, token, expiryInfo) =>
    set({
      currentRecoveryId: recoveryId,
      token,
      expiryInfo,
      error: null,
    }),

  clearCurrentRecovery: () =>
    set({
      currentRecoveryId: null,
      token: null,
      expiryInfo: null,
      options: [],
      promoCode: null,
      orderId: null,
      customerId: null,
      error: null,
    }),

  // Actions: Options
  addOption: (option) =>
    set((state) => ({
      options: [...state.options, { ...option, id: Date.now() }],
      error: null,
    })),

  removeOption: (optionId) =>
    set((state) => ({
      options: state.options.filter((opt) => opt.id !== optionId),
      error: null,
    })),

  updateOption: (optionId, updatedOption) =>
    set((state) => ({
      options: state.options.map((opt) =>
        opt.id === optionId ? { ...opt, ...updatedOption } : opt
      ),
      error: null,
    })),

  clearOptions: () =>
    set({
      options: [],
      error: null,
    }),

  // Actions: Promo
  setPromoCode: (promoCode, usageLimit) =>
    set({
      promoCode,
      promoUsageLimit: usageLimit,
      error: null,
    }),

  clearPromoCode: () =>
    set({
      promoCode: null,
      promoUsageLimit: null,
      error: null,
    }),

  // Actions: Loading & Errors
  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) =>
    set({
      error,
      isLoading: false,
      successMessage: null,
    }),

  setSuccess: (message) =>
    set({
      successMessage: message,
      error: null,
      isLoading: false,
    }),

  clearMessages: () =>
    set({
      error: null,
      successMessage: null,
    }),

  // Selector
  getRecoveryState: () => get(),
}));
