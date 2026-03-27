# IMS Studio - Inventory Management System

A modern, dark-themed Inventory and Invoicing System built with Next.js and Firebase. Designed for small businesses to manage products, customers, invoices, and staff commissions.

## Features

- **Custom Authentication**: Login with custom usernames and passwords.
- **Dashboard**: Real-time summary of sales, commissions, and monthly rankings.
- **Product Management**: Track stock levels, pricing, and automated "Stock Out" values.
- **Customer CRM**: Manage customer data and purchase history.
- **Advanced Invoicing**:
  - **DME (Dirty Money Exchange)**: Automatic 80% discount calculation.
  - **Product Variations**: Auto-fill bundles with predefined items.
  - **Serial Number Tracking**: Individual tracking for each item sold.
- **Sales Reporting**: View detailed sales logs and download records as Excel (.xlsx) files.
- **User Management**: Admin-only access to staff statistics, roles, and commissions.
- **Settings**: Manage global currency and dynamic product variation sets.

## Getting Started

### Prerequisites

- Node.js 18.x or later
- A Firebase project

### Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd imsbeta1-2
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory and add your Firebase credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Initialize Firestore Rules**:
   - Go to the **Firebase Console** -> **Firestore Database** -> **Rules**.
   - Copy the content of the `firestore.rules` file from this repository and paste it into the console.
   - Click **Publish**.

5. **Create Initial Admin**:
   - Go to the **Firebase Console** -> **Authentication**.
   - Create a new user with the email `pabloshelby@ims.local` and password `00000000`.
   - Start the app and use the "First time? Setup Initial Admin" button on the login page to initialize the Firestore profile.

6. **Run the development server**:
   ```bash
   npm run dev
   ```

### CI/CD with GitHub Actions

This project is set up with GitHub Actions to automatically deploy to Firebase Hosting.

1.  **Generate a Service Account Key**:
    - In the **Firebase Console**, go to **Project Settings** -> **Service accounts**.
    - Click **Generate new private key**.
2.  **Add Secrets to GitHub**:
    - In your GitHub repository, go to **Settings** -> **Secrets and variables** -> **Actions**.
    - Add the following secrets:
      - `FIREBASE_SERVICE_ACCOUNT_IMSBETA1_2`: (The JSON content of the service account key you just downloaded).
      - `NEXT_PUBLIC_FIREBASE_API_KEY`: (From your `.env.local`).
      - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: (From your `.env.local`).
      - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: (From your `.env.local`).
      - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: (From your `.env.local`).
      - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: (From your `.env.local`).
      - `NEXT_PUBLIC_FIREBASE_APP_ID`: (From your `.env.local`).

Now, every time you push to the `master` branch, your app will automatically deploy to the live site. Pull requests will generate preview links!

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Icons**: Lucide React
- **Charts**: Recharts
- **Export**: SheetJS (XLSX)

## License

MIT
