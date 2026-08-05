import { useState, type FormEvent } from "react";
import { BlockingDialog, type BlockingDialogProps } from "../BlockingDialog";
import { Button } from "../Button";
import { Input, type InputProps } from "../Input";
import styles from "./LoginDialog.module.css";

export type LoginDialogProps = Omit<
  BlockingDialogProps,
  "actions" | "children" | "onClose" | "title"
> & {
  error?: string;
  inputProps?: InputProps;
  pending?: boolean;
  onLogin: (loginName: string, password: string) => void | Promise<void>;
};

export function LoginDialog({
  error,
  inputProps,
  pending = false,
  onLogin,
  buttonProps,
  ...props
}: LoginDialogProps) {
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const valid = loginName.trim().length > 0 && password.length >= 4;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    void onLogin(loginName.trim(), password);
  }

  return (
    <BlockingDialog {...props} buttonProps={buttonProps} title="Flydeck Login">
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          <span>User</span>
          <Input
            {...inputProps}
            autoComplete="username"
            value={loginName}
            disabled={pending}
            onChange={(event) => setLoginName(event.currentTarget.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <Input
            {...inputProps}
            autoComplete="current-password"
            type="password"
            value={password}
            disabled={pending}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <Button {...buttonProps} type="submit" disabled={!valid || pending}>
          {pending ? "SIGNING IN…" : "SIGN IN"}
        </Button>
      </form>
    </BlockingDialog>
  );
}
