import { useState, type FormEvent } from 'react'
import { LogIn } from 'lucide-react'
import { saveLogin, verifyCredentials } from './auth'

/** 初回アクセス時に表示するログイン画面。既存ヘッダーと同じ配色・入力意匠を使用する。 */
export default function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!verifyCredentials(username, password)) {
      setError('ユーザー名またはパスワードが違います。')
      setPassword('')
      return
    }
    setError('')
    saveLogin()
    onSuccess()
  }

  return <div className="login-screen">
    <div className="login-card">
      <div className="login-header">
        <div className="logo"><img src="/logo-mark.svg" alt="" /></div>
        <div>
          <h1>昇降ストローク計算</h1>
          <p>ドラム巻径とモータ軸回転角の関係</p>
        </div>
      </div>
      <form className="login-form" onSubmit={submit}>
        <p className="login-lead">ご利用にはログインが必要です。ログイン後は同じPC・同じブラウザであれば、次回からこの画面は表示されません。</p>
        <label>
          <span>ユーザー名</span>
          <div className="input-wrap">
            <input type="text" value={username} autoComplete="username" autoFocus onChange={(event) => setUsername(event.target.value)} />
          </div>
        </label>
        <label>
          <span>パスワード</span>
          <div className="input-wrap">
            <input type="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
          </div>
        </label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit" className="primary"><LogIn size={18} />ログイン</button>
      </form>
    </div>
  </div>
}
