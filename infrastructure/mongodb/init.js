
print("MongoDB initialization starting...")

db = db.getSiblingDB("realtime-collab")

db.createCollection("users")
db.createCollection("rooms")
db.createCollection("sessions") 

db.users.createIndex(
  { email: 1 },
  { unique: true, name: "email_unique" }
)

db.users.createIndex(
  { username: 1 },
  { unique: true, name: "username_unique" }
)

db.users.createIndex(
  { createdAt: 1 },
  { name: "created_at" }
)

db.rooms.createIndex(
  { code: 1 },
  { unique: true, name: "room_code_unique" }
)

db.rooms.createIndex(
  { owner: 1 },
  { name: "room_owner" }
)

db.rooms.createIndex(
  { "members.userId": 1 },
  { name: "room_members" }
)

db.rooms.createIndex(
  { isActive: 1, updatedAt: -1 },
  { name: "active_rooms_recent" }
)


if (db.users.countDocuments() === 0) {
  print("Inserting demo user...")
  db.users.insertOne({
    username: "demo",
    email: "demo@example.com",
    // password: "demo123" — hashed (bcrypt se)
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/lA5sWUi6.",
    createdAt: new Date(),
    updatedAt: new Date()
  })
}

print("MongoDB initialization complete!")