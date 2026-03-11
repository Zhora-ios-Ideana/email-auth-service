// ─────────────────────────────────────────────────────────────────────────────
//  iOS Swift — Email Verification Integration
//  Requires: iOS 15+, Swift 5.7+
// ─────────────────────────────────────────────────────────────────────────────

import Foundation

// MARK: - Models

struct AuthResponse: Decodable {
    let success: Bool
    let message: String
    let token: String?
    let user: AuthUser?
    let needsVerification: Bool?
    let email: String?
}

struct AuthUser: Decodable {
    let id: Int
    let email: String
}

// MARK: - AuthService

final class AuthService {

    static let shared = AuthService()

    private let baseURL = "https://your-auth-api.com"   // ← change this
    private let tokenKey = "auth_token"
    private init() {}

    // ── Stored token ────────────────────────────────────────────────────────
    var storedToken: String? {
        get { UserDefaults.standard.string(forKey: tokenKey) }
        set { UserDefaults.standard.set(newValue, forKey: tokenKey) }
    }

    var isLoggedIn: Bool { storedToken != nil }

    // ── Generic request helper ───────────────────────────────────────────────
    private func post(
        endpoint: String,
        body: [String: String]
    ) async throws -> AuthResponse {

        guard let url = URL(string: baseURL + endpoint) else {
            throw URLError(.badURL)
        }

        var request        = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody   = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        let decoded = try JSONDecoder().decode(AuthResponse.self, from: data)

        if !decoded.success {
            throw AuthError.serverError(decoded.message, statusCode: http.statusCode)
        }

        return decoded
    }

    // ── Authenticated request helper ─────────────────────────────────────────
    func get(endpoint: String) async throws -> Data {
        guard let url   = URL(string: baseURL + endpoint),
              let token = storedToken else { throw AuthError.notAuthenticated }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return data
    }

    // ── 1. Register ──────────────────────────────────────────────────────────
    func register(email: String, password: String) async throws -> AuthResponse {
        return try await post(
            endpoint: "/auth/register",
            body: ["email": email, "password": password]
        )
    }

    // ── 2. Verify email ──────────────────────────────────────────────────────
    func verifyEmail(email: String, code: String) async throws -> AuthResponse {
        let result = try await post(
            endpoint: "/auth/verify",
            body: ["email": email, "code": code]
        )
        if let token = result.token {
            storedToken = token   // persist JWT
        }
        return result
    }

    // ── 3. Login ─────────────────────────────────────────────────────────────
    func login(email: String, password: String) async throws -> AuthResponse {
        let result = try await post(
            endpoint: "/auth/login",
            body: ["email": email, "password": password]
        )
        if let token = result.token {
            storedToken = token
        }
        return result
    }

    // ── 4. Resend code ───────────────────────────────────────────────────────
    func resendCode(email: String) async throws -> AuthResponse {
        return try await post(
            endpoint: "/auth/resend-code",
            body: ["email": email]
        )
    }

    // ── Logout ────────────────────────────────────────────────────────────────
    func logout() {
        storedToken = nil
    }
}

// MARK: - Error type

enum AuthError: LocalizedError {
    case serverError(String, statusCode: Int)
    case notAuthenticated

    var errorDescription: String? {
        switch self {
        case .serverError(let msg, _): return msg
        case .notAuthenticated:        return "You are not logged in."
        }
    }
}

// MARK: - Example SwiftUI ViewModel

import SwiftUI

@MainActor
final class RegisterViewModel: ObservableObject {

    @Published var email    = ""
    @Published var password = ""
    @Published var code     = ""

    @Published var step: Step = .register
    @Published var errorMessage: String?
    @Published var isLoading = false

    enum Step { case register, verify, done }

    func register() {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please fill in all fields."; return
        }
        Task {
            isLoading = true
            defer { isLoading = false }
            do {
                _ = try await AuthService.shared.register(email: email, password: password)
                step = .verify
                errorMessage = nil
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func verify() {
        guard !code.isEmpty else {
            errorMessage = "Please enter the code."; return
        }
        Task {
            isLoading = true
            defer { isLoading = false }
            do {
                _ = try await AuthService.shared.verifyEmail(email: email, code: code)
                step = .done
                errorMessage = nil
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func resend() {
        Task {
            _ = try? await AuthService.shared.resendCode(email: email)
        }
    }
}

// MARK: - Example SwiftUI View (minimal)

struct RegisterView: View {
    @StateObject private var vm = RegisterViewModel()

    var body: some View {
        switch vm.step {
        case .register:
            VStack(spacing: 16) {
                TextField("Email",    text: $vm.email)
                    .keyboardType(.emailAddress).autocapitalization(.none)
                SecureField("Password", text: $vm.password)
                if let err = vm.errorMessage {
                    Text(err).foregroundColor(.red).font(.caption)
                }
                Button("Create Account") { vm.register() }
                    .disabled(vm.isLoading)
            }.padding()

        case .verify:
            VStack(spacing: 16) {
                Text("Enter the 6-digit code sent to \(vm.email)")
                    .multilineTextAlignment(.center)
                TextField("000000", text: $vm.code)
                    .keyboardType(.numberPad).multilineTextAlignment(.center)
                    .font(.system(size: 32, weight: .bold, design: .monospaced))
                if let err = vm.errorMessage {
                    Text(err).foregroundColor(.red).font(.caption)
                }
                Button("Verify") { vm.verify() }
                    .disabled(vm.isLoading)
                Button("Resend code") { vm.resend() }
                    .font(.caption).foregroundColor(.blue)
            }.padding()

        case .done:
            VStack {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 64)).foregroundColor(.green)
                Text("All set!").font(.title.bold())
                Text("Your account is verified.").foregroundColor(.secondary)
            }
        }
    }
}
