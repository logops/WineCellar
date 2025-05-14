import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SchemaUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SchemaUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "cellar-master-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login with username: ${username}`);
        
        // Try to get user by email (since username field contains email)
        const user = await storage.getUserByEmail(username);
        
        if (!user) {
          console.log(`No user found with email: ${username}`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        console.log(`User found: ${user.id} (${user.email})`);
        
        // Check password
        const passwordValid = await comparePasswords(password, user.password);
        if (!passwordValid) {
          console.log('Password validation failed');
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        console.log('Password validation succeeded');
        return done(null, user);
      } catch (error) {
        console.error('Login error:', error);
        return done(error as Error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Registration attempt with data:', {
        ...req.body,
        password: req.body.password ? '[REDACTED]' : undefined
      });
      
      const email = req.body.email;
      
      if (!email) {
        console.log('Registration failed: Missing email');
        return res.status(400).json({ message: "Email is required" });
      }
      
      if (!req.body.password) {
        console.log('Registration failed: Missing password');
        return res.status(400).json({ message: "Password is required" });
      }
      
      // Check for existing email
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        console.log(`Registration failed: Email already exists: ${email}`);
        return res.status(400).json({ message: "Email already in use" });
      }

      // Use email as username
      const userData = {
        ...req.body,
        username: email,
        password: await hashPassword(req.body.password),
      };

      console.log(`Creating user with email: ${email}`);
      const user = await storage.createUser(userData);
      console.log(`User created successfully with ID: ${user.id}`);

      req.login(user, (err) => {
        if (err) {
          console.error('Error during login after registration:', err);
          return next(err);
        }
        console.log(`User ${user.id} automatically logged in after registration`);
        return res.status(201).json(user);
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    console.log('Login attempt with username:', req.body.username);
    
    if (!req.body.username || !req.body.password) {
      console.log('Login failed: Missing username or password');
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    passport.authenticate("local", (err: Error | null, user: SchemaUser | false, info: { message: string } | undefined) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('Login failed: Authentication failed', info);
        return res.status(401).json({ message: info?.message || "Incorrect email or password" });
      }
      
      console.log(`User ${(user as SchemaUser).id} authenticated successfully`);
      
      req.login(user, (err) => {
        if (err) {
          console.error('Login session error:', err);
          return next(err);
        }
        console.log(`Login session created for user ${(user as SchemaUser).id}`);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(req.user);
  });
  
  // Middleware to check if user is authenticated
  app.use("/api/*", (req: Request, res: Response, next: NextFunction) => {
    // Skip auth check for login, register, logout, and user endpoints
    if (
      req.path === "/api/login" || 
      req.path === "/api/register" || 
      req.path === "/api/logout" || 
      req.path === "/api/user"
    ) {
      return next();
    }
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    next();
  });
}