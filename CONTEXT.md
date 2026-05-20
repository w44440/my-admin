# My Admin

This context defines the product language for the admin application. It keeps the first version focused on an authenticated operations shell rather than a finished business system.

## Language

**Admin Console**:
A web application used by internal users to view and operate platform information.
_Avoid_: Dashboard, back office

**Operations Shell**:
The first version of the **Admin Console**, using mock data to show layout and basic management entry points without binding to concrete business entities.
_Avoid_: Full admin product, CRUD system

**Protected Page**:
A page that requires a completed **Logto Session** before it can be viewed.
_Avoid_: Private page, secure page

**Logto Session**:
The frontend authentication state managed by the Logto React SDK.
_Avoid_: Fake login, local auth

**Mock User List**:
A placeholder user table used to demonstrate the **Operations Shell** without calling the Logto Management API.
_Avoid_: User management, Logto user admin

## Relationships

- An **Admin Console** starts as one **Operations Shell**.
- A **Protected Page** requires exactly one active **Logto Session**.
- A **Mock User List** belongs to the **Operations Shell** and is not a Logto Management API client.

## Example dialogue

> **Dev:** "Should the users page edit real Logto users?"
> **Domain expert:** "No. In this version it is only a **Mock User List** inside the **Operations Shell**."

## Flagged ambiguities

- "User management" can imply Logto Management API integration; resolved: the first version only includes a **Mock User List**.
