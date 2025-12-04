/**
 * Auth Slice - 用户认证状态管理
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean; // 标记是否从持久化存储恢复完成
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 登录成功
    loginSuccess: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    
    // 退出登录
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    
    // 更新用户信息
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    
    // 更新 token
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    
    // 标记 hydration 完成（从持久化存储恢复完成）
    setHydrated: (state) => {
      state.isHydrated = true;
    },
  },
});

export const { loginSuccess, logout, updateUser, setToken, setHydrated } = authSlice.actions;
export default authSlice.reducer;

