tn-webrats/
│
├─ docs/
│   ├─ context.md
│   ├─ architecture.md
│   ├─ database_schema.md
│   ├─ features.md
│   ├─ agent_rules.md
│   ├─ development_rules.md
│   └─ system_prompts.md
│
├─ frontend/
│   ├─ public/
│   │   ├─ index.html
│   │   ├─ about.html
│   │   ├─ services.html
│   │   ├─ projects.html
│   │   ├─ help.html
│   │   ├─ book.html
│   │   ├─ signup.html
│   │   └─ login.html
│   │
│   ├─ dashboards/
│   │   ├─ owner-dashboard.html
│   │   ├─ superadmin-dashboard.html
│   │   ├─ admin-dashboard.html
│   │   ├─ manager-dashboard.html
│   │   └─ worker-dashboard.html
│   │
│   ├─ components/
│   │   ├─ navbar.js
│   │   ├─ order-card.js
│   │   ├─ progress-bar.js
│   │   └─ notification.js
│   │
│   ├─ styles/
│   │   └─ styles.css
│   │
│   └─ utils/
│       ├─ firebase.js
│       ├─ auth.js
│       └─ api.js
│
├─ backend/
│   ├─ server/
│   │   ├─ index.js
│   │   ├─ routes/
│   │   │   ├─ orders.js
│   │   │   ├─ wallet.js
│   │   │   ├─ payroll.js
│   │   │   ├─ referrals.js
│   │   │   └─ users.js
│   │   │
│   │   ├─ services/
│   │   │   ├─ orderService.js
│   │   │   ├─ walletService.js
│   │   │   ├─ payrollService.js
│   │   │   └─ paymentService.js
│   │   │
│   │   ├─ middleware/
│   │   │   ├─ authMiddleware.js
│   │   │   └─ roleMiddleware.js
│   │   │
│   │   └─ utils/
│   │       ├─ logger.js
│   │       └─ validators.js
│   │
│   └─ cloud-functions/
│       ├─ orderAutoApprove.js
│       ├─ paymentWebhook.js
│       └─ payrollDistribution.js
│
├─ database/
│   ├─ firestore.rules
│   ├─ firestore.indexes.json
│   └─ migrations/
│
├─ infrastructure/
│   ├─ docker-compose.yml
│   ├─ caddyfile
│   └─ deployment.md
│
├─ scripts/
│   ├─ seedDatabase.js
│   └─ maintenanceTasks.js
│
├─ tests/
│   ├─ api/
│   ├─ integration/
│   └─ security/
│
├─ .env.example
├─ package.json
├─ README.md
└─ LICENSE