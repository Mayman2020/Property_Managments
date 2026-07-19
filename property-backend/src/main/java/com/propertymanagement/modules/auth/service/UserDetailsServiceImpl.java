package com.propertymanagement.modules.auth.service;

import com.propertymanagement.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import com.propertymanagement.modules.user.entity.User;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .or(() -> userRepository.findByEmailIgnoreCase(email))
                .or(() -> userRepository.findByUsernameIgnoreCase(email))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
}
