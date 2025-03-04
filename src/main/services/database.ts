import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import Database from 'better-sqlite3';
import Logger from './logger';

export class DatabaseManager {
    private static instance: DatabaseManager;
    private db: Database.Database;
    private logger: Logger;

    private constructor() {
        this.logger = Logger.getInstance();
        this.db = this.initializeDatabase();
    }

    static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    getDatabase(): Database.Database {
        return this.db;
    }

    private initializeDatabase(): Database.Database {
        try {
            // Get the user data directory
            const userDataPath = app.getPath('userData');
            this.logger.info(`User data path: ${userDataPath}`);

            // Create the database directory if it doesn't exist
            const dbDir = path.join(userDataPath, 'db');
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
                this.logger.info(`Created database directory: ${dbDir}`);
            }

            // Initialize the database
            const dbPath = path.join(dbDir, 'vectordb.sqlite');
            this.logger.info(`Database path: ${dbPath}`);

            const db = new Database(dbPath, { verbose: this.logger.debug.bind(this.logger) });
            this.logger.info('Database connection established');

            // Enable foreign keys
            db.pragma('foreign_keys = ON');

            // Initialize schema
            this.initializeSchema(db);

            return db;
        } catch (error) {
            this.logger.error('Failed to initialize database:', error as Error);
            throw error;
        }
    }

    private initializeSchema(db: Database.Database): void {
        try {
            // Get the schema SQL
            const schemaPath = this.findSchemaFile();
            if (!schemaPath) {
                throw new Error('Schema file not found');
            }

            this.logger.info(`Using schema file: ${schemaPath}`);
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');

            // Execute the schema SQL
            db.exec(schemaSql);
            this.logger.info('Database schema initialized');

            // Apply migrations
            this.applyMigrations(db);
        } catch (error) {
            this.logger.error('Failed to initialize schema:', error as Error);
            throw error;
        }
    }

    private findSchemaFile(): string | null {
        // Try different possible locations for the schema file
        const possiblePaths = [
            path.join(__dirname, 'sql', 'schema.sql'),
            path.join(__dirname, '..', 'sql', 'schema.sql'),
            path.join(__dirname, '..', '..', 'sql', 'schema.sql'),
            path.join(app.getAppPath(), 'dist', 'main', 'sql', 'schema.sql'),
            path.join(app.getAppPath(), 'sql', 'schema.sql'),
            path.join(process.cwd(), 'dist', 'main', 'sql', 'schema.sql'),
            path.join(process.cwd(), 'sql', 'schema.sql'),
        ];

        for (const p of possiblePaths) {
            this.logger.debug(`Checking for schema file at: ${p}`);
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }

    private applyMigrations(db: Database.Database): void {
        try {
            // Find migrations directory
            const migrationsDir = this.findMigrationsDir();
            if (!migrationsDir) {
                this.logger.warn('Migrations directory not found, skipping migrations');
                return;
            }

            this.logger.info(`Using migrations directory: ${migrationsDir}`);

            // Get list of migration files
            const migrationFiles = fs.readdirSync(migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort(); // Sort to ensure migrations are applied in order

            if (migrationFiles.length === 0) {
                this.logger.info('No migration files found');
                return;
            }

            this.logger.info(`Found ${migrationFiles.length} migration files`);

            // Create migrations table if it doesn't exist
            db.exec(`
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Get list of applied migrations
            const appliedMigrations = db.prepare('SELECT name FROM migrations').all() as { name: string }[];
            const appliedMigrationNames = new Set(appliedMigrations.map(m => m.name));

            // Apply each migration that hasn't been applied yet
            for (const file of migrationFiles) {
                if (!appliedMigrationNames.has(file)) {
                    this.logger.info(`Applying migration: ${file}`);
                    const migrationPath = path.join(migrationsDir, file);
                    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

                    // Start a transaction for the migration
                    db.transaction(() => {
                        // Apply the migration
                        db.exec(migrationSql);

                        // Record the migration as applied
                        db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
                    })();

                    this.logger.info(`Migration applied: ${file}`);
                } else {
                    this.logger.debug(`Migration already applied: ${file}`);
                }
            }

            this.logger.info('All migrations applied successfully');
        } catch (error) {
            this.logger.error('Failed to apply migrations:', error as Error);
            throw error;
        }
    }

    private findMigrationsDir(): string | null {
        // Try different possible locations for the migrations directory
        const possiblePaths = [
            path.join(__dirname, 'sql', 'migrations'),
            path.join(__dirname, '..', 'sql', 'migrations'),
            path.join(__dirname, '..', '..', 'sql', 'migrations'),
            path.join(app.getAppPath(), 'dist', 'main', 'sql', 'migrations'),
            path.join(app.getAppPath(), 'sql', 'migrations'),
            path.join(process.cwd(), 'dist', 'main', 'sql', 'migrations'),
            path.join(process.cwd(), 'sql', 'migrations'),
        ];

        for (const p of possiblePaths) {
            this.logger.debug(`Checking for migrations directory at: ${p}`);
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }

    close(): void {
        if (this.db) {
            this.db.close();
            this.logger.info('Database connection closed');
        }
    }
}