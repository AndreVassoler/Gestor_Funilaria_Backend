import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Uma única linha (id=1) com o refresh token da conta Google conectada. */
@Entity('google_calendar_token')
export class GoogleCalendarToken {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'text' })
  refreshToken: string;
}
