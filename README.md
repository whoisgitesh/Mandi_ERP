# Mandi ERP

A modern ERP system inspired by Microsoft Dynamics 365 Business Central, designed for Mandi, Trading, Manufacturing, Inventory, Procurement, Sales, Assembly, and Quality Management operations.

---

# Overview

Mandi ERP is a full-stack enterprise resource planning application built to replicate Business Central workflows while supporting industry-specific Mandi operations.

The system includes:

* Master Data Management
* Inventory Management
* Procurement Management
* Sales Management
* Manufacturing
* Assembly Management
* Quality Management
* GST & TDS Compliance
* No. Series Management
* Ledger Entries
* Reversal Management

---

# Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Shadcn UI
* React Query
* Axios

## Backend

* Node.js
* Express.js
* JWT Authentication
* REST APIs

## Database

* PostgreSQL
* Neon PostgreSQL (Cloud)

## Deployment

* Vercel (Frontend)
* Render (Backend)
* Neon PostgreSQL (Database)

---

# Architecture

```text
React Frontend
      ↓
Express Backend API
      ↓
PostgreSQL Database
```

---

# Core Modules

## Setup & Configuration

* No. Series
* No. Series Relationships
* Inventory Setup
* Purchase & Payables Setup
* Sales & Receivables Setup
* GST Setup
* TDS Setup

---

## Masters

### Customer Master

* Customer Card
* Customer List
* Customer Ledger

### Vendor Master

* Vendor Card
* Vendor List
* Vendor Ledger

### Item Master

* Item Categories
* Family
* Unit of Measure
* Item Tracking
* Quality Specifications

### Location Master

* State Integration
* GST Integration

### Currency

* Currency Card
* Currency Exchange Management

### Salesperson / Purchaser

* Salesperson Card
* Purchaser Assignment

---

# Purchase Management

## Purchase Flow

```text
Vendor
 ↓
Purchase Order
 ↓
Inward Gate Entry
 ↓
GRN
 ↓
Posted Purchase Receipt
 ↓
Purchase Invoice
 ↓
Posted Purchase Invoice
 ↓
Vendor Ledger Entry
```

Features:

* Quantity Tracking
* Bill Quantity
* QC Integration
* GST Calculation
* TDS Calculation
* Receipt Reversal

---

# Sales Management

## Sales Flow

```text
Customer
 ↓
Sales Order
 ↓
Posted Sales Shipment
 ↓
Sales Invoice
 ↓
Posted Sales Invoice
 ↓
Customer Ledger Entry
```

Features:

* Shipment Posting
* Invoice Posting
* Shipment Reversal
* Customer Ledger Integration

---

# Manufacturing

## Production Flow

```text
Production BOM
 ↓
Certified Production BOM
 ↓
Finished Goods Item
 ↓
Released Production Order
 ↓
Refresh Production Order
 ↓
Consumption Journal
 ↓
Output Journal
 ↓
Item Ledger Entries
```

Features:

* Material Consumption
* Production Output
* Inventory Adjustment
* Cost Tracking

---

# Assembly Management

## Assembly Flow

```text
Assembly BOM
 ↓
Assembly Order
 ↓
Post Assembly Order
 ↓
Item Ledger Entries
```

Features:

* Assembly Consumption
* Assembly Output
* Inventory Update

---

# Quality Management

## Quality Flow

```text
Item
 ↓
Quality Specification
 ↓
Quality Inspection
 ↓
Accepted Quantity
 ↓
Rejected Quantity
 ↓
Inventory Update
```

Features:

* Quality Parameters
* Acceptance/Rejection Logic
* Inspection History

---

# Inventory Management

## Item Tracking

Supported Tracking:

* Lot Tracking
* Serial Tracking
* Expiration Tracking

## Inventory Journals

* Item Journal
* Consumption Journal
* Output Journal

## Inventory Visibility

* Item Ledger Entries
* Availability by Location

---

# Reversal Management

Supported Reversals:

### Purchase

```text
Posted Purchase Receipt
 ↓
Undo Receipt
 ↓
Reversal Entry
```

### Sales

```text
Posted Sales Shipment
 ↓
Undo Shipment
 ↓
Reversal Entry
```

Features:

* Audit Trail
* Reversal History
* Inventory Restoration
* Ledger References

---

# No. Series Management

All major entities support configurable numbering:

Examples:

* Customer
* Vendor
* Item
* Purchase Order
* Sales Order
* GRN
* Inward Gate Entry
* Production BOM
* Released Production Order
* Assembly Order
* Posted Documents
* Reversal Entries
* Salesperson/Purchaser

Business Central-style No. Series Relationships are supported.

---

# Authentication

Features:

* User Registration
* Login
* JWT Authentication
* Role-based Authorization
* Protected Routes

---

# Environment Variables

Backend

```env
DATABASE_URL=
JWT_SECRET=
NODE_ENV=production
PORT=5000
```

Frontend

```env
VITE_API_BASE_URL=
```

---

# Installation

## Clone Repository

```bash
git clone <repository-url>
cd Mandi_ERP
```

## Install Dependencies

Frontend

```bash
npm install
```

Backend

```bash
cd backend
npm install
```

---

# Database Migration

Run:

```bash
node runMigration.cjs
```

Expected Output:

```text
ALL MIGRATIONS COMPLETED SUCCESSFULLY
```

---

# Running Locally

Backend

```bash
cd backend
npm start
```

Frontend

```bash
npm run dev
```

---

# Deployment

Frontend

* Vercel

Backend

* Render

Database

* Neon PostgreSQL

---

# Future Roadmap

* Warehouse Management
* Bin Management
* Transfer Orders
* Return Orders
* Advanced Manufacturing
* Capacity Planning
* Approval Workflows
* Reporting & Analytics
* Mobile Application
* Multi-Company Support

---

# Author

Gitesh Pal

ERP inspired by Microsoft Dynamics 365 Business Central and customized for Mandi, Manufacturing, Inventory, Procurement, and Sales operations.

