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

**Signal Light**:
A physical three-color light device managed in the **Admin Console**.
_Avoid_: Lamp, point, status item

**LoRa Gateway**:
A gateway device that owns and scopes a set of **Signal Light** devices.
_Avoid_: Gateway group, station

**Signal Light Number**:
The identifier of a **Signal Light** within one **LoRa Gateway**.
_Avoid_: Global light ID, display order

**Product Piece Count**:
The counted number of product pieces associated with one **Signal Light**.
_Avoid_: Generic count, status count

**Signal Light Reading**:
The backend-provided snapshot data for one **Signal Light**, including its current color and **Product Piece Count**.
_Avoid_: Derived state, frontend counter

**Signal Light Color**:
The current color state of one **Signal Light**. Allowed values are `off`, `red`, `yellow`, and `green`.
_Avoid_: Generic status, unknown color

**No Data**:
The state where a queried **Signal Light Number** has no returned **Signal Light Reading**.
_Avoid_: Off, closed light

**Polling Session**:
An active page state that receives **Signal Light Reading** data for one fixed query condition set.
_Avoid_: One-time query, manual refresh

**Signal Light Range**:
The consecutive set of one to three **Signal Light** devices selected by one start **Signal Light Number** and one display count.
_Avoid_: Random light list, grouped card

## Relationships

- An **Admin Console** starts as one **Operations Shell**.
- A **Protected Page** requires exactly one active **Logto Session**.
- A **Mock User List** belongs to the **Operations Shell** and is not a Logto Management API client.
- A **LoRa Gateway** owns zero or more **Signal Light** devices.
- A **Signal Light Number** is unique only within one **LoRa Gateway**.
- A **Signal Light** belongs to the **Admin Console** as an operated field device.
- A **Product Piece Count** belongs to one **Signal Light**.
- A **Signal Light Reading** belongs to one **Signal Light**.
- A **Signal Light Reading** includes exactly one **Signal Light Color**.
- **No Data** means the queried **Signal Light Number** has no **Signal Light Reading**.
- A **Signal Light Range** contains one, two, or three consecutive **Signal Light** devices within one **LoRa Gateway**.
- One **Polling Session** displays exactly one **Signal Light Range**.
- A **Polling Session** uses one **LoRa Gateway**, one start **Signal Light Number**, and one display count.
- A **Polling Session** starts only when the page polling control is turned on.

## Example dialogue

> **Dev:** "Should the users page edit real Logto users?"
> **Domain expert:** "No. In this version it is only a **Mock User List** inside the **Operations Shell**."
>
> **Dev:** "Is each light on the new page just a UI row?"
> **Domain expert:** "No. Each **Signal Light** is a physical device shown in the **Admin Console**."
>
> **Dev:** "Is light number 12 unique across the whole system?"
> **Domain expert:** "No. A **Signal Light Number** is only unique within one **LoRa Gateway**."
>
> **Dev:** "Is the displayed count just a generic device metric?"
> **Domain expert:** "No. It is the **Product Piece Count** associated with one **Signal Light**."
>
> **Dev:** "Does the page compute count changes from color transitions?"
> **Domain expert:** "No. The page only shows a **Signal Light Reading** returned by the backend API."
>
> **Dev:** "Can the light state be something other than the three colors?"
> **Domain expert:** "Yes. **Signal Light Color** can also be `off`."
>
> **Dev:** "If a light number has no returned reading, should it look closed?"
> **Domain expert:** "No. That is **No Data**, not `off`."
>
> **Dev:** "Is this page doing one query per click?"
> **Domain expert:** "No. It runs one **Polling Session** with fixed conditions."
>
> **Dev:** "Should the page start polling as soon as it opens?"
> **Domain expert:** "No. The polling control is off by default; a **Polling Session** starts only after it is turned on."
>
> **Dev:** "Is the result rendered as one merged group card?"
> **Domain expert:** "No. One **Signal Light Range** is rendered as separate cards, one card per **Signal Light**."

## Flagged ambiguities

- "User management" can imply Logto Management API integration; resolved: the first version only includes a **Mock User List**.
- "编号" was ambiguous; resolved: use **Signal Light Number**, scoped to one **LoRa Gateway**.
- "计数" was ambiguous; resolved: use **Product Piece Count** rather than a generic device count.
- "颜色切换计数" conflicted with the current design; resolved: the page shows backend-provided **Signal Light Reading** data rather than frontend-derived counters.
- "状态" was ambiguous; resolved: use **Signal Light Color** with `off`, `red`, `yellow`, and `green`.
- "关闭" and missing readings were conflicting meanings; resolved: missing readings are **No Data**, not `off`.
- "查询" was too weak for the current page behavior; resolved: the main interaction is a **Polling Session** rather than a one-time query.
- Initial page load and polling activation were overlapping concerns; resolved: the polling control is off by default, so no **Polling Session** starts on first load.
- "一组状态" was ambiguous; resolved: use **Signal Light Range** for the queried set, but render separate cards per **Signal Light**.
