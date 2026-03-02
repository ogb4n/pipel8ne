import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Entité domaine User.
 * Les décorateurs TypeORM restent ici par pragmatisme — ils décrivent le modèle,
 * pas la plomberie technique. L'implémentation concrète est dans Infrastructure.
 */
@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, type: "varchar" })
  name: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
