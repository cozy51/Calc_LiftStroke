import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AUTH_STORAGE_KEY, clearLogin, isLoggedIn, saveLogin, verifyCredentials } from './auth'

/** localStorageを持たないテスト環境向けの最小限の代替実装。 */
function createStorageStub(): Storage {
  const store = new Map<string, string>()
  return {
    get length() { return store.size },
    key: (index: number) => [...store.keys()][index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: createStorageStub(), configurable: true, writable: true })
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('verifyCredentials', () => {
  it('固定のユーザー名とパスワードで認証できる', () => {
    expect(verifyCredentials('muratec', 'muratec')).toBe(true)
    expect(verifyCredentials('  muratec  ', ' muratec ')).toBe(true)
  })

  it('誤った入力を拒否する', () => {
    expect(verifyCredentials('muratec', 'wrong')).toBe(false)
    expect(verifyCredentials('other', 'muratec')).toBe(false)
    expect(verifyCredentials('', '')).toBe(false)
    expect(verifyCredentials('MURATEC', 'MURATEC')).toBe(false)
  })
})

describe('ログイン状態の保存', () => {
  it('初回アクセス時は未ログインになる', () => {
    expect(isLoggedIn()).toBe(false)
  })

  it('保存後は再アクセスでもログイン済みと判定する', () => {
    saveLogin()

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull()
    expect(isLoggedIn()).toBe(true)
  })

  it('ログアウトでlocalStorageの情報を削除する', () => {
    saveLogin()
    clearLogin()

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    expect(isLoggedIn()).toBe(false)
  })

  it('別ブラウザ相当の空のストレージでは未ログインになる', () => {
    saveLogin()
    Object.defineProperty(globalThis, 'localStorage', { value: createStorageStub(), configurable: true, writable: true })

    expect(isLoggedIn()).toBe(false)
  })

  it('想定外の値が保存されていてもログイン済みとしない', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true')

    expect(isLoggedIn()).toBe(false)
  })

  it('localStorageを利用できない環境でも例外を投げない', () => {
    Reflect.deleteProperty(globalThis, 'localStorage')

    expect(() => saveLogin()).not.toThrow()
    expect(() => clearLogin()).not.toThrow()
    expect(isLoggedIn()).toBe(false)
  })
})
