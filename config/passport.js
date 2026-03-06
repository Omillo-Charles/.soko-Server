import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import prisma from '../database/postgresql.js';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL } from './env.js';
import { sendEmail } from './nodemailer.js';
import { getWelcomeEmailTemplate } from '../utils/emailTemplates.js';

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    proxy: true,
    passReqToCallback: true,
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        let user = await prisma.user.findFirst({ where: { googleId: profile.id } });

        if (!user) {
            const email = profile.emails[0].value;
            user = await prisma.user.findUnique({ where: { email } });

            if (user) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId: profile.id }
                });
                user = await prisma.user.findUnique({ where: { id: user.id } });
            } else {
                user = await prisma.user.create({
                    data: {
                        name: profile.displayName,
                        email,
                        googleId: profile.id,
                        isVerified: true
                    }
                });

                try {
                    const template = getWelcomeEmailTemplate(user.name, 'Google');
                    await sendEmail({
                        to: user.email,
                        subject: template.subject,
                        text: template.text,
                        html: template.html
                    });
                } catch (emailError) {
                    
                }
            }
        }
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: GITHUB_CALLBACK_URL,
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await prisma.user.findFirst({ where: { githubId: profile.id } });

        if (!user) {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.com`;
            user = await prisma.user.findUnique({ where: { email } });

            if (user) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { githubId: profile.id }
                });
                user = await prisma.user.findUnique({ where: { id: user.id } });
            } else {
                user = await prisma.user.create({
                    data: {
                        name: profile.displayName || profile.username,
                        email,
                        githubId: profile.id,
                        isVerified: true
                    }
                });

                try {
                    const template = getWelcomeEmailTemplate(user.name, 'GitHub');
                    await sendEmail({
                        to: user.email,
                        subject: template.subject,
                        text: template.text,
                        html: template.html
                    });
                } catch (emailError) {
                    
                }
            }
        }
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// We don't need full sessions as we use JWT, but passport requires these
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    prisma.user.findUnique({ where: { id } }).then(user => done(null, user));
});

export default passport;
