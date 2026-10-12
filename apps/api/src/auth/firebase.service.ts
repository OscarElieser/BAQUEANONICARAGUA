import { Injectable } from '@nestjs/common';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService {
  private readonly app: App;

  constructor() {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    this.app =
      getApps()[0] ??
      initializeApp(
        b64
          ? { credential: cert(JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))) }
          : { projectId: process.env.FIREBASE_PROJECT_ID }, // credenciales por defecto del entorno
      );
  }

  /** Verifica firma, expiración, audiencia y revocación del ID token. */
  verify(idToken: string): Promise<DecodedIdToken> {
    return getAuth(this.app).verifyIdToken(idToken, /* checkRevoked */ true);
  }
}
