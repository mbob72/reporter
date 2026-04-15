export type AuthSession = {
  accessToken: string;
  expiresAt: string;
};

export interface ExternalAuthProvider {
  authenticate(input: {
    serviceKey: string;
    username: string;
    password: string;
  }): Promise<AuthSession>;
}
